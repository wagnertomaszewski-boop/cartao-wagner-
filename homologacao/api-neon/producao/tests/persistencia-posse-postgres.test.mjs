import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {generateKeyPairSync} from 'node:crypto';
import {criarVerificadorPossePorDesafio} from '../conferente-externo/verificador-posse-por-desafio.mjs';
import {criarPersistenciaPossePostgres} from '../conferente-externo/persistencia-posse-postgres.mjs';
import {criarEmissorExternoPorRecibo} from '../conferente-externo/emitir-atestado-por-recibo.mjs';

const verificador=generateKeyPairSync('ed25519'),conferente=generateKeyPairSync('ed25519');
const verificadorId='00000000-0000-4000-8000-000000000015';
const conferenteId='00000000-0000-4000-8000-000000000013';
const operadorId='00000000-0000-4000-8000-000000000012';
const base=Date.parse('2026-11-22T22:00:00.000Z');
function id(n){return '00000000-0000-4000-8000-'+String(n).padStart(12,'0');}

async function laboratorio(){
 const db=new PGlite();
 const sql=await readFile(new URL('../conferente-externo/sql/laboratorio-desafios-posse-NAO-EXECUTAR.sql',import.meta.url),'utf8');
 // Execução APENAS neste PostgreSQL WASM descartável, sem conexão a Neon/Supabase.
 await db.exec(sql);
 const query=(q,p)=>q.includes('pg_advisory_xact_lock')
  ?Promise.resolve({rows:[]}):db.query(q,p);
 const pool={query,connect:async()=>({query,release(){}})};
 const persistencia=criarPersistenciaPossePostgres({pool});
 const enviados=[],recebidos=[];
 let agora=base;
 const servico=criarVerificadorPossePorDesafio({
  chavePrivadaVerificador:verificador.privateKey,
  verificadorId,segredoDesafios:'segredo-de-laboratorio-mais-de-trinta-e-dois-caracteres',
  buscarContextoAutorizado:async ({pedidoId,operadorId})=>({
   pedidoId,operadorId,solicitacaoId:'123',
   telefoneOriginal:'+555188887777',telefoneNovo:'+5551999988888'
  }),
  enviarDesafio:async d=>{enviados.push(d);return true;},
  persistencia,
  registrarReciboPrivado:async d=>{recebidos.push(d);return true;},
  relogio:()=>agora
 });
 return {db,persistencia,servico,enviados,recebidos,
  avancar:ms=>{agora+=ms;},relogio:()=>agora};
}

test('PostgreSQL isolado: código em HMAC, confirmação única, evidência assinada',async()=>{
 const lab=await laboratorio();
 try{
  const pedido=await lab.servico.iniciar({pedidoId:id(11),operadorId});
  assert.equal(Object.hasOwn(pedido,'codigo'),false);
  const r=await lab.db.query('SELECT * FROM verificador_posse_hml.desafios');
  assert.equal(r.rows.length,1);
  assert.equal(Buffer.from(r.rows[0].codigo_verificador).length,32);
  assert.equal(JSON.stringify(r.rows[0]).includes(lab.enviados[0].codigo),false);
  assert.equal((await lab.servico.confirmar({desafioId:pedido.desafioId,codigo:lab.enviados[0].codigo})).confirmado,true);
  assert.equal((await lab.servico.confirmar({desafioId:pedido.desafioId,codigo:lab.enviados[0].codigo})).confirmado,false);
  assert.equal(lab.recebidos.length,1);
  const emitir=criarEmissorExternoPorRecibo({
   chavePrivadaConferente:conferente.privateKey,
   chavePublicaVerificador:verificador.publicKey,
   conferenteId,verificadoresPermitidos:[verificadorId],
   relogio:lab.relogio
  });
  const a=emitir(lab.recebidos[0]);
  assert.equal(typeof a?.assinatura,'string');
  const linha=(await lab.db.query('SELECT tentativas,confirmado_em FROM verificador_posse_hml.desafios')).rows[0];
  assert.equal(linha.tentativas,1);
  assert.ok(linha.confirmado_em);
 }finally{await lab.db.close();}
});

test('PostgreSQL isolado: no máximo cinco tentativas, vencimento e proibição de reemissão',async()=>{
 const lab=await laboratorio();
 try{
  const p=await lab.servico.iniciar({pedidoId:id(21),operadorId});
  const codigo=lab.enviados[0].codigo,errado=codigo==='000000'?'111111':'000000';
  for(let i=0;i<5;i++)assert.equal((await lab.servico.confirmar({desafioId:p.desafioId,codigo:errado})).confirmado,false);
  assert.equal((await lab.servico.confirmar({desafioId:p.desafioId,codigo})).confirmado,false);
  assert.equal(lab.recebidos.length,0);
  await assert.rejects(lab.servico.iniciar({pedidoId:id(21),operadorId}),/indisponível/);
  const q=await lab.servico.iniciar({pedidoId:id(22),operadorId});
  lab.avancar(300000);
  assert.equal((await lab.servico.confirmar({desafioId:q.desafioId,codigo:lab.enviados[1].codigo})).confirmado,false);
 }finally{await lab.db.close();}
});

test('PostgreSQL isolado: cota por novo destino compartilhada por pedidos diferentes',async()=>{
 const lab=await laboratorio();
 try{
  for(let i=0;i<3;i++){
   const x=await lab.servico.iniciar({pedidoId:id(31+i),operadorId});
   assert.ok(x.desafioId);
  }
  await assert.rejects(lab.servico.iniciar({pedidoId:id(34),operadorId}),/indisponível/);
  assert.equal((await lab.db.query('SELECT count(*)::int AS total FROM verificador_posse_hml.desafios')).rows[0].total,3);
  assert.equal(lab.enviados.length,3);
 }finally{await lab.db.close();}
});

test('PostgreSQL isolado: revogação impede prova e fonte não executa SQL fora do schema',async()=>{
 const lab=await laboratorio();
 try{
  const p=await lab.servico.iniciar({pedidoId:id(41),operadorId});
  await lab.persistencia.revogar({desafioId:p.desafioId});
  assert.equal((await lab.servico.confirmar({desafioId:p.desafioId,codigo:lab.enviados[0].codigo})).confirmado,false);
  const linhas=(await lab.db.query("SELECT table_schema,table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema')")).rows;
  assert.deepEqual(linhas.filter(x=>x.table_schema==='public'),[]);
 }finally{await lab.db.close();}
});
