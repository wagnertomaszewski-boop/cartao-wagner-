// Smoke test SOMENTE para Neon de homologação, com dados fictícios.
// Uso: MANDATO_AMBIENTE=homologacao HABILITAR_API_NEON=sim HABILITAR_ROTAS_CIDADAO_TESTES=sim
//      NEON_HOST_HOMOLOGACAO=... NEON_USUARIO_SERVICO_HOMOLOGACAO=mandato_api_homologacao
//      DATABASE_URL=... node smoke-http-neon-real.mjs
// Exige pacote pg instalado localmente. Não imprimir credenciais.
import assert from 'node:assert/strict';
import {iniciarHomologacao} from './iniciar-homologacao.mjs';

if(process.env.MANDATO_AMBIENTE!=='homologacao' ||
   process.env.HABILITAR_API_NEON!=='sim' ||
   process.env.HABILITAR_ROTAS_CIDADAO_TESTES!=='sim' ||
   process.env.NEON_USUARIO_SERVICO_HOMOLOGACAO!=='mandato_api_homologacao')
 throw Error('Ambiente de testes não habilitado explicitamente');

const instancia=await iniciarHomologacao();
try {
 await new Promise((resolve,reject)=>{
  instancia.servidor.once('error',reject);
  instancia.servidor.listen(0,'127.0.0.1',resolve);
 });
 const base='http://127.0.0.1:'+instancia.servidor.address().port;
 const health=await fetch(base+'/health',{signal:AbortSignal.timeout(8000)});
 assert.equal(health.status,200,'Servidor de homologação indisponível');
 const estado=await health.json();
 assert.equal(estado.modo,'homologacao');
 assert.equal(estado.rotasCidadaoHabilitadas,true);
 const origemInvalida=await fetch(base+'/api/solicitacoes/consultar',{
  method:'POST',headers:{Origin:'https://origem-nao-permitida.invalid','Content-Type':'application/json'},
  body:'{}',signal:AbortSignal.timeout(8000)
 });
 assert.equal(origemInvalida.status,403,'Origem não autorizada deve ser rejeitada');
 const corpoExcessivo=await fetch(base+'/api/solicitacoes/consultar',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({protocolo:'FICTICIO',chave:'a'.repeat(5000)}),
  signal:AbortSignal.timeout(8000)
 });
 assert.equal(corpoExcessivo.status,413,'Corpo excessivo deve ser rejeitado');
 const resposta=await fetch(base+'/api/solicitacoes/consultar',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({protocolo:'PROTOCOLO-HTTP-TESTE-INEXISTENTE',chave:'a'.repeat(64)}),
  signal:AbortSignal.timeout(8000)
 });
 assert.equal(resposta.status,200,'Falha na integração HTTP-Neon');
 const corpo=await resposta.json();
 assert.deepEqual(corpo,{resultado:[],respostas:[],historico:[],anexos:[]});
 const admin=await fetch(base+'/api/admin/recuperacoes',{signal:AbortSignal.timeout(8000)});
 assert.equal(admin.status,401,'Rota administrativa deve exigir autenticação');
 console.log('PASS: HTTP-Neon real, health, CORS, limite de corpo, consulta fictícia e admin protegido');
} finally {await instancia.fechar();}
