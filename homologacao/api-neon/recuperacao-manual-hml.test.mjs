import {autotestarRecuperacaoManual,autotestarDestinoPessoal} from './autoteste-manual-hml.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {criarRecuperacaoManualHml} from './recuperacao-manual-hml.mjs';
import {criarFluxoIsoladoHml} from './fluxo-isolado-hml.mjs';
const op={usuarioId:'operador-ficticio'},telefone='+5551000000000';
const conferencia={identidadeConferida:true,telefoneConfirmado:telefone,justificativa:'Identidade conferida em atendimento fictício.',decisao:'aprovar'};
async function banco(cfg={}){const pg=new PGlite();await pg.exec('CREATE ROLE mandato_auth_hml');for(const f of ['auth-admin-hml.sql','recuperacao-manual-hml.sql'])await pg.exec(await readFile(new URL('./sql/'+f,import.meta.url),'utf8'));let livre=Promise.resolve();const pool={query:(s,p)=>pg.query(s,p),connect:async()=>{let soltar;const minha=new Promise(r=>{soltar=r;});const anterior=livre;livre=minha;await anterior;return {query:(s,p)=>pg.query(s,p),release:soltar};}};const segredo=randomBytes(48).toString('hex'),fluxo=criarRecuperacaoManualHml({pool,segredo,...cfg});return {pg,pool,f:fluxo,consulta:criarFluxoIsoladoHml({pool,segredo}),async pedido(){const p=await fluxo.criarFixture(op);return {...await fluxo.solicitar({protocolo:p.protocolo,telefone}),fixture:p};}};}
test('manual: identidade, telefone, HMAC, recibo privado e recuperação atômica de uso único',async()=>{
 const {pg,pool,f,consulta,pedido}=await banco();try{
  const r=await pedido(),id=r.pedidoId,d=conferencia;
  assert.equal((await consulta.consultar({protocolo:r.fixture.protocolo})).encontrado,false);
  await assert.rejects(f.emitir(id,op,d),{status:403});
  await assert.rejects(f.decidir(id,op,{...d,justificativa:'curta'}),{status:400});
  await assert.rejects(f.decidir(id,op,{...d,identidadeConferida:false}),{status:403});
  await f.decidir(id,op,d);await assert.rejects(f.decidir(id,op,d),{status:409});
  await assert.rejects(f.emitir(id,{usuarioId:'outro'},d),{status:403});
  await assert.rejects(f.emitir(id,op,{...d,telefoneConfirmado:'+5551000000001'}),{status:403});
  const e=await f.emitir(id,op,d);assert.match(e.codigo,/^\d{6}$/);assert.equal(e.envioPermitido,false);assert.equal(e.entregaConfirmada,false);
  const h=(await pool.query('SELECT codigo_hash FROM auth_admin_hml.recuperacoes_manuais WHERE id=$1',[id])).rows[0].codigo_hash;assert.match(h,/^[0-9a-f]{64}$/);assert.notEqual(h,e.codigo);
  await assert.rejects(f.registrarAbertura(id,op,d),{status:403});await assert.rejects(f.emitir(id,op,d),{status:429});
  assert.equal((await f.validar({...r,recibo:'a'.repeat(43),codigo:e.codigo})).confirmado,false);
  const final=await f.validar({...r,codigo:e.codigo});assert.equal(final.confirmado,true);assert.equal((await f.validar({...r,codigo:e.codigo})).confirmado,false);
  assert.equal((await consulta.consultar({protocolo:r.fixture.protocolo,chave:r.fixture.chaveInicial})).encontrado,false);
  assert.equal((await consulta.consultar({protocolo:r.fixture.protocolo,chave:final.novaChave})).encontrado,true);
  const eventos=JSON.stringify((await pool.query('SELECT * FROM auth_admin_hml.auditoria')).rows);assert.ok(!eventos.includes(e.codigo));assert.ok(!eventos.includes(final.novaChave));assert.ok(eventos.includes('manual_codigo_validado'));
 }finally{await pg.close();}
});
test('manual: rejeição, expiração exata, cinco erros, reemissão e limite de três emissões',async()=>{
 let agora=Date.now(),n=0;const {pg,f,pedido}=await banco({agora:()=>agora,gerarCodigo:()=>String(++n).padStart(6,'0')});const d=conferencia;
 try{
  const rejeitado=await pedido();await f.decidir(rejeitado.pedidoId,op,{...d,decisao:'rejeitar',identidadeConferida:false});await assert.rejects(f.emitir(rejeitado.pedidoId,op,d),{status:403});
  const exp=await pedido();await f.decidir(exp.pedidoId,op,d);const e=await f.emitir(exp.pedidoId,op,d);assert.equal(new Date(e.expiraEm).getTime(),agora+300000);agora+=300000;assert.equal((await f.validar({...exp,codigo:e.codigo})).confirmado,false);
  const blo=await pedido();await f.decidir(blo.pedidoId,op,d);const b=await f.emitir(blo.pedidoId,op,d);for(let i=0;i<5;i++)assert.equal((await f.validar({...blo,codigo:'999999'})).confirmado,false);assert.equal((await f.validar({...blo,codigo:b.codigo})).confirmado,false);agora+=60000;await assert.rejects(f.emitir(blo.pedidoId,op,d),{status:403});
  const novo=await pedido();await f.decidir(novo.pedidoId,op,d);const e1=await f.emitir(novo.pedidoId,op,d);agora+=60000;const e2=await f.emitir(novo.pedidoId,op,d);assert.notEqual(e1.desafioId,e2.desafioId);assert.equal((await f.validar({...novo,codigo:e1.codigo})).confirmado,false);agora+=60000;await f.emitir(novo.pedidoId,op,d);agora+=60000;await assert.rejects(f.emitir(novo.pedidoId,op,d),{status:429});
 }finally{await pg.close();}
});
test('manual: resposta neutra, limite de pedidos, abertura autorizada sem prova de entrega e invalidação de pedidos paralelos',async()=>{
 const {pg,pool,f}=await banco({telefoneTeste:telefone});const d=conferencia;
 try{
  const p=await f.criarFixture(op);const neutro=await f.solicitar({protocolo:p.protocolo,telefone:'+5551000000001'});assert.equal(neutro.recebido,true);assert.equal((await f.listar()).pedidos.length,0);
  const a=await f.solicitar({protocolo:p.protocolo,telefone}),b=await f.solicitar({protocolo:p.protocolo,telefone});await f.solicitar({protocolo:p.protocolo,telefone});await f.solicitar({protocolo:p.protocolo,telefone});assert.equal((await f.listar()).pedidos.length,3);
  for(const r of [a,b])await f.decidir(r.pedidoId,op,d);
  const ea=await f.emitir(a.pedidoId,op,d),eb=await f.emitir(b.pedidoId,op,d);assert.equal(ea.envioPermitido,true);assert.deepEqual(await f.registrarAbertura(a.pedidoId,op,{...d,desafioId:ea.desafioId}),{entregaConfirmada:false});
  assert.equal((await f.validar({...a,codigo:ea.codigo})).confirmado,true);assert.equal((await f.validar({...b,codigo:eb.codigo})).confirmado,false);
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM auth_admin_hml.auditoria WHERE evento='manual_abertura_whatsapp_solicitada'")).rows[0].n,1);
 }finally{await pg.close();}
});

test('autoteste não envia WhatsApp e não repete após evidência persistente',async()=>{const {pg,pool,f:manual,consulta:fluxo}=await banco();try{assert.equal((await autotestarRecuperacaoManual({manual,fluxo,pool})).jaExecutado,false);assert.equal((await autotestarRecuperacaoManual({manual,fluxo,pool})).jaExecutado,true);}finally{await pg.close();}});
test('destino pessoal: autorização explícita e repetição; vínculo imutável à fixture; auditoria sem número',async()=>{
 const {pg,pool,f}=await banco();const pessoal='+5551999999999';const d={telefone:pessoal,confirmacaoTelefone:pessoal,autorizoMeuNumero:true};
 try{
  await assert.rejects(f.criarFixture(op,{...d,autorizoMeuNumero:false}),{status:400});
  await assert.rejects(f.criarFixture(op,{...d,confirmacaoTelefone:'+5551999999998'}),{status:400});
  await assert.rejects(f.criarFixture(op,{...d,telefone:'123',confirmacaoTelefone:'123'}),{status:400});
  const p=await f.criarFixture(op,d),r=await f.solicitar({protocolo:p.protocolo,telefone:pessoal});
  const conferir={...conferencia,telefoneConfirmado:pessoal};await f.decidir(r.pedidoId,op,conferir);
  const e=await f.emitir(r.pedidoId,op,conferir);assert.equal(e.envioPermitido,true);
  assert.equal((await f.registrarAbertura(r.pedidoId,op,{...conferir,desafioId:e.desafioId})).entregaConfirmada,false);
  const rows=JSON.stringify((await pool.query('SELECT evento,usuario_id,pedido_id FROM auth_admin_hml.auditoria')).rows);assert.ok(rows.includes('manual_destino_pessoal_autorizado'));assert.ok(!rows.includes(pessoal));assert.ok(!rows.includes(e.codigo));
  // Alterar o telefone invalida sua autorização assinada, sem redirecionar mensagens.
  await pool.query('UPDATE auth_admin_hml.pedidos SET telefone_cadastrado=$2 WHERE id=$1',[p.id,'+5551999999998']);
  await assert.rejects(f.registrarAbertura(r.pedidoId,op,{...conferir,telefoneConfirmado:'+5551999999998',desafioId:e.desafioId}),{status:403});
 }finally{await pg.close();}
});

test('autoteste pessoal no banco não envia mensagens e guarda apenas evidência sem número',async()=>{const {pg,pool,f:manual}=await banco();try{assert.equal((await autotestarDestinoPessoal({manual,pool})).jaExecutado,false);assert.equal((await autotestarDestinoPessoal({manual,pool})).jaExecutado,true);}finally{await pg.close();}});
