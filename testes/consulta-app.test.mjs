import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {criarClienteConsulta,normalizarTelefoneRecuperacao,validarConfiguracaoConsulta,validarProtocolo} from '../seguranca/consulta-app-cliente.mjs';

const cfg={ativo:true,ambiente:'producao',projeto:'pmmsdjozyyxkbuqlkfpb',apiBase:'https://mandato-api-producao.onrender.com',versao:'candidata'};
const dados={protocolo:'2026-000001',chave:'a'.repeat(43)};
const uuid='00000000-0000-4000-8000-000000000001';
function simular(resposta={encontrado:true,status:'Recebida'}) {
  const calls=[];
  const cliente=criarClienteConsulta(cfg,async (url,op)=>{
    calls.push({url,op});
    return {ok:true,status:200,json:async()=>resposta};
  });
  return {cliente,calls};
}
test('a configuração desligada falha fechada e não possibilita chamadas no app',async()=>{
  const config=JSON.parse(await readFile(new URL('../seguranca/config-consulta-publica.json',import.meta.url),'utf8'));
  assert.equal(config.ativo,false);
  assert.equal(config.apiBase,'');
  assert.throws(()=>criarClienteConsulta(config,()=>{throw Error('NÃO CHAMAR');}),/manutenção/);
  assert.throws(()=>validarConfiguracaoConsulta({}),/manutenção/);
});
test('recusa servidores desconhecidos, homologação, HTTP, query, auth embutida e host parecido',()=>{
 for(const apiBase of [
   'http://mandato-api-producao.onrender.com',
   'https://mandato-api-producao.onrender.com.evil.example',
   'https://mandato-neon-homologacao.onrender.com',
   'https://mandato-api-producao.onrender.com/?chave=abc',
   'https://user:senha@mandato-api-producao.onrender.com',
   'https://pmmsdjozyyxkbuqlkfpb.supabase.co/rest/v1',
   'javascript:alert(1)'
 ]) assert.throws(()=>validarConfiguracaoConsulta({...cfg,apiBase}),/API de produção não aprovada|Configuração/);
 assert.equal(validarConfiguracaoConsulta({...cfg,apiBase:'https://pmmsdjozyyxkbuqlkfpb.supabase.co/functions/v1/mandato-privado'}),
 'https://pmmsdjozyyxkbuqlkfpb.supabase.co/functions/v1/mandato-privado');
});
test('não consulta protocolo sem chave forte, nem com chave curta ou inválida',async()=>{
 const {cliente,calls}=simular();
 await assert.rejects(cliente.consultar({protocolo:dados.protocolo}),/chave individual/);
 await assert.rejects(cliente.consultar({...dados,chave:'123456'}),/chave individual/);
 await assert.rejects(cliente.consultar({...dados,protocolo:'\n2026-000001'}),/protocolo/);
 assert.equal(calls.length,0);
});
test('consulta usa somente POST, corpo JSON, sem token em URL, sem cookies nem referrer',async()=>{
 const {cliente,calls}=simular();
 const r=await cliente.consultar(dados);
 assert.equal(r.encontrado,true);
 assert.equal(calls.length,1);
 const {url,op}=calls[0];
 assert.equal(url,'https://mandato-api-producao.onrender.com/api/v1/solicitacoes/consultar');
 assert.equal(op.method,'POST');
 assert.equal(op.credentials,'omit');
 assert.equal(op.cache,'no-store');
 assert.equal(op.redirect,'error');
 assert.equal(op.referrerPolicy,'no-referrer');
 assert.equal(op.headers.Authorization,undefined);
 assert.deepEqual(JSON.parse(op.body),dados);
 assert.equal(url.includes(dados.chave),false);
});
test('protocolo inexistente não vaza detalhes nem se servidor responder com campos extras',async()=>{
 const {cliente}=simular({encontrado:false,descricao:'NÃO EXIBIR',nome:'NÃO EXIBIR'});
 const r=await cliente.consultar(dados);
 assert.deepEqual(r,{encontrado:false});
});
test('primeiro acesso aceita formato cadastrado com 8 ou 9 dígitos, sem inventar nono',()=>{
 assert.equal(normalizarTelefoneRecuperacao('(51) 99999-9999'),'+5551999999999');
 assert.equal(normalizarTelefoneRecuperacao('(51) 9999-9999'),'+555199999999');
 assert.equal(normalizarTelefoneRecuperacao('+55 (51) 9999-9999'),'+555199999999');
 assert.throws(()=>normalizarTelefoneRecuperacao('+351999999999'),/brasileiro/);
 assert.throws(()=>normalizarTelefoneRecuperacao('5511'),/DDD/);
});
test('recuperação usa rota privada e retorno neutro, não embute telefone na URL',async()=>{
 const {cliente,calls}=simular({pedidoId:uuid,recibo:'b'.repeat(43)});
 const r=await cliente.solicitar({protocolo:dados.protocolo,telefone:'(51) 99999-9999'});
 assert.equal(r.pedidoId,uuid);
 assert.match(calls[0].url,/\/api\/v1\/recuperacao\/solicitar$/);
 assert.equal(calls[0].url.includes('99999'),false);
 assert.equal(JSON.parse(calls[0].op.body).telefone,'+5551999999999');
});
test('código é de seis dígitos, uso sem formato correto não alcança servidor',async()=>{
 const {cliente,calls}=simular({validado:false});
 await assert.rejects(cliente.validar({pedidoId:uuid,recibo:'b'.repeat(43),codigo:'123'}),/seis dígitos/);
 await assert.rejects(cliente.validar({pedidoId:'qualquer',recibo:'b'.repeat(43),codigo:'123456'}),/seis dígitos/);
 assert.equal(calls.length,0);
 const r=await cliente.validar({pedidoId:uuid,recibo:'b'.repeat(43),codigo:'123456'});
 assert.deepEqual(r,{validado:false});
 assert.equal(calls[0].url.includes('123456'),false);
});
test('código validado emite chave forte; resposta inválida não é aceita',async()=>{
 const ok=criarClienteConsulta(cfg,async()=>({ok:true,status:200,json:async()=>({validado:true,protocolo:dados.protocolo,novaChave:'c'.repeat(43)})}));
 assert.deepEqual(await ok.validar({pedidoId:uuid,recibo:'b'.repeat(43),codigo:'123456'}),{validado:true,protocolo:dados.protocolo,novaChave:'c'.repeat(43)});
 const ruim=criarClienteConsulta(cfg,async()=>({ok:true,status:200,json:async()=>({validado:true,protocolo:dados.protocolo,novaChave:'sem-seguranca'})}));
 await assert.rejects(ruim.validar({pedidoId:uuid,recibo:'b'.repeat(43),codigo:'123456'}),/chave individual/);
});
test('download exige UUID e chave, sem caminhos ou URLs públicas',async()=>{
 const {cliente,calls}=simular({base64:'JVBERi0=',mime:'application/pdf',nome:'resposta.pdf'});
 assert.throws(()=>cliente.baixar({...dados,arquivoId:'https://example.com/arquivo.pdf'}),/Arquivo privado/);
 assert.equal(calls.length,0);
 await cliente.baixar({...dados,arquivoId:uuid});
 assert.match(calls[0].url,/\/api\/v1\/arquivos\/baixar$/);
 assert.equal(calls[0].url.includes(uuid),false);
 assert.deepEqual(JSON.parse(calls[0].op.body),{...dados,arquivoId:uuid});
});
test('falhas de servidor não vazam detalhes de credenciais nem registram segredo',async()=>{
 const cliente=criarClienteConsulta(cfg,async()=>({ok:false,status:403,json:async()=>({erro:'sql privado: vazamento'})}));
 await assert.rejects(cliente.consultar(dados),e=>!e.message.includes('vazamento')&&!e.message.includes(dados.chave));
});
test('página TWA não contém RPC antiga, consulta por protocolo puro nem URLs públicas de anexos',async()=>{
 const html=await readFile(new URL('../acompanhar.html',import.meta.url),'utf8');
 const ui=await readFile(new URL('../seguranca/consulta-app-ui.mjs',import.meta.url),'utf8');
 assert.match(html,/seguranca\/consulta-app-ui\.mjs/);
 assert.match(html,/id="chave"/);
 assert.match(html,/id="primeiroAcesso"/);
 assert.match(html,/id="manutencao"/);
 for(const codigo of [html,ui]) {
  assert.doesNotMatch(codigo,/consulta_publica_(?:protocolo|respostas_protocolo|historico_protocolo)|consultar_protocolo/);
  assert.doesNotMatch(codigo,/service_role|sb_secret_|localStorage|sessionStorage/);
  assert.doesNotMatch(codigo,/\/storage\/v1\/object\/public\/documentos-respostas/);
 }
 assert.doesNotMatch(ui,/\.innerHTML\s*=/);
});

test('V2 oferece caminho para a tela segura do aplicativo, sem trocar o app Android', async()=>{
  for(const path of ['v2/index.html','v2/acompanhar.html']){
    const h=await readFile(new URL('../'+path,import.meta.url),'utf8');
    assert.match(h,/href="\.\.\/acompanhar\.html"/);
    assert.match(h,/Acompanhamento temporariamente em manutenção/);
  }
});
test('a interface referência apenas elementos existentes na tela TWA',async()=>{
  const h=await readFile(new URL('../acompanhar.html',import.meta.url),'utf8');
  const js=await readFile(new URL('../seguranca/consulta-app-ui.mjs',import.meta.url),'utf8');
  for(const m of js.matchAll(/\$\('([^']+)'\)/g)){
    assert.ok(h.includes('id="'+m[1]+'"'),'Elemento ausente no HTML: '+m[1]);
  }
});
