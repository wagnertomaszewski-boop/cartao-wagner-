import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {criarFluxoIsoladoHml} from '../fluxo-isolado-hml.mjs';
// PostgreSQL real compilado em WASM; transporte de mensagens é deliberadamente fictício.
async function banco(){const pg=new PGlite();await pg.exec(await readFile(new URL('../sql/auth-admin-hml.sql',import.meta.url),'utf8'));return {pg,pool:{query:(s,p)=>pg.query(s,p),connect:async()=>({query:(s,p)=>pg.query(s,p),release(){}})}};}
test('recuperação com persistência PostgreSQL: aprovação, código único, chave nova e auditoria atômica',async()=>{
 const {pg,pool}=await banco();let codigo;
 const fluxo=criarFluxoIsoladoHml({pool,segredo:randomBytes(48).toString('hex'),telefoneTeste:'+5551999999999',enviarCodigo:async d=>{codigo=d.codigo;return true;}});
 const op={usuarioId:'administrador-ficticio'};
 try{
  const pedido=await fluxo.criar(op);assert.equal((await fluxo.consultar({protocolo:pedido.protocolo,chave:pedido.chaveInicial})).encontrado,true);
  await assert.rejects(fluxo.concluir(pedido.id,op));await assert.rejects(fluxo.iniciar(pedido.id,op));
  await fluxo.aprovar(pedido.id,op);await assert.rejects(fluxo.aprovar(pedido.id,op));
  await assert.rejects(fluxo.iniciar(pedido.id,{usuarioId:'outro-operador'}));
  const d=await fluxo.iniciar(pedido.id,op);assert.equal('codigo' in d,false);
  const wrong=codigo==='000000'?'111111':'000000';assert.equal((await fluxo.confirmar({pedidoId:pedido.id,desafioId:d.desafioId,codigo:wrong})).confirmado,false);
  assert.equal((await fluxo.confirmar({pedidoId:pedido.id,desafioId:d.desafioId,codigo})).confirmado,true);
  assert.equal((await fluxo.confirmar({pedidoId:pedido.id,desafioId:d.desafioId,codigo})).confirmado,false);
  const final=await fluxo.concluir(pedido.id,op);
  assert.equal((await fluxo.consultar({protocolo:pedido.protocolo,chave:pedido.chaveInicial})).encontrado,false);
  assert.equal((await fluxo.consultar({protocolo:pedido.protocolo,chave:final.novaChave})).encontrado,true);
  await assert.rejects(fluxo.concluir(pedido.id,op));
  const eventos=await fluxo.auditoria();assert.ok(eventos.some(e=>e.evento==='aprovacao_auditada'));assert.ok(eventos.some(e=>e.evento==='recuperacao_concluida_chave_substituida'));
  const registro=(await pool.query('SELECT codigo_hash,chave_hash FROM auth_admin_hml.pedidos WHERE id=$1',[pedido.id])).rows[0];assert.equal(registro.codigo_hash,null);assert.notEqual(registro.chave_hash,final.novaChave);
 }finally{await pg.close();}
});
test('WhatsApp não configurado, provedor recusando envio, expiração e limite de tentativas bloqueiam recuperação',async()=>{
 const {pg,pool}=await banco();const op={usuarioId:'operador-ficticio'};let codigo;
 const cfg={pool,segredo:randomBytes(48).toString('hex'),telefoneTeste:'+5551999999999'};
 const sem=criarFluxoIsoladoHml(cfg);const recusa=criarFluxoIsoladoHml({...cfg,enviarCodigo:async()=>false});const aceita=criarFluxoIsoladoHml({...cfg,enviarCodigo:async d=>{codigo=d.codigo;return true;}});
 try{
  const p=await sem.criar(op);await sem.aprovar(p.id,op);
  await assert.rejects(sem.iniciar(p.id,op));await assert.rejects(recusa.iniciar(p.id,op));
  let d=await aceita.iniciar(p.id,op);const wrong=codigo==='000000'?'111111':'000000';
  for(let i=0;i<5;i++)assert.equal((await aceita.confirmar({pedidoId:p.id,desafioId:d.desafioId,codigo:wrong})).confirmado,false);
  assert.equal((await aceita.confirmar({pedidoId:p.id,desafioId:d.desafioId,codigo})).confirmado,false);
  await pool.query("UPDATE auth_admin_hml.pedidos SET expira_em=now()-interval '1 second' WHERE id=$1",[p.id]);
  d=await aceita.iniciar(p.id,op);
  await pool.query("UPDATE auth_admin_hml.pedidos SET expira_em=now()-interval '1 second' WHERE id=$1",[p.id]);
  assert.equal((await aceita.confirmar({pedidoId:p.id,desafioId:d.desafioId,codigo})).confirmado,false);
  await assert.rejects(aceita.concluir(p.id,op));
 }finally{await pg.close();}
});
