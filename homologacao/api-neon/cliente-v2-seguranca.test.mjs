import test from 'node:test';
import assert from 'node:assert/strict';
import {criarConsultaSegura} from '../../v2/seguranca/consulta-segura.mjs';

test('cliente rejeita API HTTP e URL com credenciais ou parâmetros',()=>{
 for(const url of ['http://exemplo.invalid/','https://usuario:senha@exemplo.invalid/','https://exemplo.invalid/caminho','https://exemplo.invalid/?chave=segredo']){
  assert.throws(()=>criarConsultaSegura({apiBase:url}));
 }
});
test('consulta envia chave apenas no corpo HTTPS, sem cookies, redirecionamento ou cache',async()=>{
 let chamadas=0;
 const api=criarConsultaSegura({apiBase:'https://api-homologacao.example/',buscar:async(url,opcoes)=>{
  chamadas++;
  assert.equal(url,'https://api-homologacao.example/api/solicitacoes/consultar');
  assert.equal(opcoes.method,'POST');
  assert.equal(opcoes.credentials,'omit');
  assert.equal(opcoes.cache,'no-store');
  assert.equal(opcoes.redirect,'error');
  assert.equal(opcoes.headers.Authorization,undefined);
  assert.equal(opcoes.body.includes('segredo-de-teste-'),true);
  assert.equal(url.includes('segredo'),false);
  assert.deepEqual(JSON.parse(opcoes.body),{protocolo:'TESTE-000006',chave:'segredo-de-teste-aaaaaaaaaaaaaaaaaaaaaaaa'});
  return {ok:true,json:async()=>({resultado:[]})};
 }});
 await api.consultar({protocolo:' TESTE-000006 ',chave:'segredo-de-teste-aaaaaaaaaaaaaaaaaaaaaaaa'});
 assert.equal(chamadas,1);
});
test('recuperação normaliza WhatsApp e resposta de falha não expõe dados internos',async()=>{
 const api=criarConsultaSegura({apiBase:'https://api-homologacao.example/',buscar:async(url,opcoes)=>{
  assert.equal(url,'https://api-homologacao.example/api/recuperacao/solicitar');
  assert.deepEqual(JSON.parse(opcoes.body),{protocolo:'TESTE-000006',whatsapp:'51999990019'});
  return {ok:false,status:503};
 }});
 await assert.rejects(()=>api.pedirRecuperacao({protocolo:' TESTE-000006 ',whatsapp:'(51) 99999-0019'}),/Não foi possível concluir/);
});
test('cliente bloqueia chaves curtas e telefones inválidos antes de enviar',async()=>{
 let chamadas=0;
 const api=criarConsultaSegura({apiBase:'https://api-homologacao.example/',buscar:async()=>{chamadas++;throw Error('não deveria enviar');}});
 await assert.rejects(()=>api.consultar({protocolo:'TESTE-000006',chave:'curta'}));
 await assert.rejects(()=>api.pedirRecuperacao({protocolo:'TESTE-000006',whatsapp:'123'}));
 assert.equal(chamadas,0);
});
