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
 // Protocolo sintético previamente criado no Neon isolado: a chave incorreta
 // jamais pode liberar assunto, histórico, respostas ou anexos.
 const negado=await fetch(base+'/api/solicitacoes/consultar',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({protocolo:'TESTE-000006',chave:'chave-incorreta-sintetica-000000000000000000000000'}),
  signal:AbortSignal.timeout(8000)
 });
 assert.equal(negado.status,200,'Consulta de chave incorreta deve ser neutra');
 assert.deepEqual(await negado.json(),{resultado:[],respostas:[],historico:[],anexos:[]},
  'Chave incorreta não pode liberar dados de solicitação existente');
 // Validação positiva com chave SOMENTE fictícia, previamente registrada
 // no banco Neon isolado. Não testa ou consulta protocolos de cidadãos reais.
 const legadoValido=await fetch(base+'/api/solicitacoes/consultar',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({protocolo:'LEGADO-TESTE-900003',chave:'CHAVE-FICTICIA-HOMOLOGACAO-900003-VALIDA-2026'}),
  signal:AbortSignal.timeout(8000)
 });
 assert.equal(legadoValido.status,200,'Consulta legada válida não respondeu HTTP 200');
 const legadoCorpo=await legadoValido.json();
 assert.deepEqual(legadoCorpo.resultado,[{assunto:'Teste legado de homologação',status:'recebido'}],
  'Chave válida deve retornar somente os dados autorizados do protocolo fictício');
 assert.ok(Array.isArray(legadoCorpo.respostas) && Array.isArray(legadoCorpo.historico) && Array.isArray(legadoCorpo.anexos));
 const legadoInvalido=await fetch(base+'/api/solicitacoes/consultar',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({protocolo:'LEGADO-TESTE-900003',chave:'CHAVE-FICTICIA-HOMOLOGACAO-900003-ERRADA-2026'}),
  signal:AbortSignal.timeout(8000)
 });
 assert.equal(legadoInvalido.status,200);
 assert.deepEqual(await legadoInvalido.json(),{resultado:[],respostas:[],historico:[],anexos:[]});
 const semChave=await fetch(base+'/api/solicitacoes/consultar',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({protocolo:'TESTE-000006'}),
  signal:AbortSignal.timeout(8000)
 });
 assert.notEqual(semChave.status,200,'Consulta sem chave deve ser rejeitada');
 // Pedidos simultâneos com dados fictícios: o servidor não pode falhar nem
 // revelar se o protocolo e o contato correspondem a um registro existente.
 const recuperacoes=await Promise.all(Array.from({length:6},()=>fetch(base+'/api/recuperacao/solicitar',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({protocolo:'TESTE-000006',whatsapp:'51999990019'}),
  signal:AbortSignal.timeout(15000)
 })));
 const mensagens=[];
 let bloqueios=0;
 for(const r of recuperacoes){
  assert.ok([200,429].includes(r.status),'Recuperação simultânea deve ser neutra ou limitada');
  if(r.status===429){bloqueios++;continue;}
  mensagens.push(await r.json());
 }
 assert.ok(mensagens.length>=1,'Ao menos um pedido deve receber resposta neutra');
 assert.ok(mensagens.every(m=>JSON.stringify(m)===JSON.stringify(mensagens[0])));
 assert.deepEqual(mensagens[0],{mensagem:'Se os dados corresponderem, o pedido será analisado.'});
 assert.ok(bloqueios>=1,'Proteção de taxa deve limitar a rajada de seis pedidos');
 const admin=await fetch(base+'/api/admin/recuperacoes',{signal:AbortSignal.timeout(8000)});
 assert.equal(admin.status,401,'Rota administrativa deve exigir autenticação');
 console.log('PASS: HTTP-Neon real, health, CORS, limite de corpo, consulta fictícia, chave incorreta, chave ausente, recuperações simultâneas e admin protegido');
} finally {await instancia.fechar();}
