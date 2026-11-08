// Smoke de leitura REAL HTTP -> servidor -> Neon isolado.
// Nenhuma rota de recuperacao ou escrita e invocada.
import assert from 'node:assert/strict';
import {iniciarHomologacao} from './iniciar-homologacao.mjs';

if(process.env.MANDATO_AMBIENTE!=='homologacao' ||
 process.env.HABILITAR_API_NEON!=='sim' ||
 process.env.HABILITAR_ROTAS_CIDADAO_TESTES!=='sim' ||
 process.env.NEON_USUARIO_SERVICO_HOMOLOGACAO!=='mandato_api_homologacao')
 throw Error('Homologacao com papel restrito obrigatoria');

const instancia=await iniciarHomologacao();
try {
 await new Promise((resolve,reject)=>{
  instancia.servidor.once('error',reject);
  instancia.servidor.listen(0,'127.0.0.1',resolve);
 });
 const base='http://127.0.0.1:'+instancia.servidor.address().port;
 const health=await fetch(base+'/health',{signal:AbortSignal.timeout(8000)});
 assert.equal(health.status,200);
 assert.equal((await health.json()).rotasCidadaoHabilitadas,true);
 const consulta=async(protocolo,chave)=>fetch(base+'/api/solicitacoes/consultar',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({protocolo,chave}),signal:AbortSignal.timeout(10000)
 });
 const vazio={resultado:[],respostas:[],historico:[],anexos:[]};
 const inexistente=await consulta('PROTOCOLO-HTTP-INEXISTENTE-TESTE','CHAVE-FICTICIA-INVALIDA-000000000000000000000');
 assert.equal(inexistente.status,200,'Consulta real no Neon deve responder HTTP 200');
 assert.deepEqual(await inexistente.json(),vazio);
 const incorreta=await consulta('LEGADO-TESTE-900003','CHAVE-FICTICIA-HOMOLOGACAO-900003-ERRADA-2026');
 assert.equal(incorreta.status,200);
 assert.deepEqual(await incorreta.json(),vazio,'Chave incorreta nao pode revelar dados');
 const semChave=await fetch(base+'/api/solicitacoes/consultar',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({protocolo:'LEGADO-TESTE-900003'}),
  signal:AbortSignal.timeout(8000)
 });
 assert.notEqual(semChave.status,200);
 const admin=await fetch(base+'/api/admin/recuperacoes',{signal:AbortSignal.timeout(8000)});
 assert.equal(admin.status,401);
 console.log('PASS: HTTP-Neon REAL somente leitura; consulta vazia, chave incorreta, chave ausente e admin protegido');
} finally {await instancia.fechar();}
