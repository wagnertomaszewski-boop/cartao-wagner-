import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarConsultaSegura} from './consulta-segura.mjs';
const chave='a'.repeat(64);
test('não aceita HTTP ou URL com credenciais',()=>{
 for(const apiBase of ['http://localhost:8787/','https://usuario:senha@api.example.com/','https://api.example.com/?token=1']) assert.throws(()=>criarConsultaSegura({apiBase}));
});
test('consulta exige protocolo e chave completa',async()=>{
 let chamadas=0;
 const api=criarConsultaSegura({apiBase:'https://api.example.com/',buscar:async()=>{chamadas++;return {ok:true,json:async()=>({})};}});
 await assert.rejects(api.consultar({protocolo:'TESTE-000001',chave:'curta'}));
 assert.equal(chamadas,0);
});
test('consulta envia chave apenas no corpo e não persiste no navegador',async()=>{
 let url,opcoes;
 const api=criarConsultaSegura({apiBase:'https://api.example.com/',buscar:async(u,o)=>{url=u;opcoes=o;return {ok:true,json:async()=>({resultado:[]})};}});
 assert.deepEqual(await api.consultar({protocolo:' TESTE-000001 ',chave}),{resultado:[]});
 assert.equal(url,'https://api.example.com/api/solicitacoes/consultar');
 assert.deepEqual(JSON.parse(opcoes.body),{protocolo:'TESTE-000001',chave});
 assert.equal(opcoes.cache,'no-store');
 assert.equal(opcoes.credentials,'omit');
 assert.equal(opcoes.redirect,'error');
 assert.equal(url.includes(chave),false);
});
test('recuperação normaliza WhatsApp e usa rota existente',async()=>{
 let url,corpo;
 const api=criarConsultaSegura({apiBase:'https://api.example.com/',buscar:async(u,o)=>{url=u;corpo=JSON.parse(o.body);return {ok:true,json:async()=>({mensagem:'Recebido'})};}});
 await api.pedirRecuperacao({protocolo:' TESTE-000001 ',whatsapp:'(51) 99999-0001'});
 assert.equal(url,'https://api.example.com/api/recuperacao/solicitar');
 assert.deepEqual(corpo,{protocolo:'TESTE-000001',whatsapp:'51999990001'});
});
test('falhas HTTP não expõem dados do servidor',async()=>{
 const api=criarConsultaSegura({apiBase:'https://api.example.com/',buscar:async()=>({ok:false,status:500})});
 await assert.rejects(api.consultar({protocolo:'TESTE-000001',chave}),/Não foi possível concluir/);
});
