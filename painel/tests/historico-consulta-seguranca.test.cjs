// node painel/tests/historico-consulta-seguranca.test.cjs
// Extrai a funcao real; DOM e rede totalmente simulados.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const inicio=html.indexOf('async function consultarHistoricoFiscalizacaoMandato(');
const fim=html.indexOf('function registrarCobrancaMandato(',inicio);
assert.ok(inicio>=0&&fim>inicio,'Funcao de consulta nao encontrada');
const codigo=html.slice(inicio,fim);
function elemento(tag){
 return {tag,textContent:'',disabled:false,children:[],
   appendChild(child){this.children.push(child)},
   replaceChildren(){this.children=[]}};
}
async function caso(modo){
 const destino=elemento('div'),botao=elemento('button'),chamadas=[];
 const perigoso='<img src=x onerror=alert(1)>';
 const dados=[{id:1,solicitacao_id:7,tipo:'cobranca',descricao:perigoso,protocolo_referencia:'PROTO-001',registrado_em:'2026-11-08T12:00:00Z'}];
 const deps={
  document:{getElementById:()=>destino,createElement:elemento},
  obterSessaoValida:async()=>modo==='sessao'?null:{access_token:'fake'},
  SUPABASE_URL:'https://example.invalid',SUPABASE_KEY:'fake',
  requisicao:async(url,options)=>{chamadas.push({url,options});return {
    ok:modo!=='erro',status:modo==='erro'?500:200,
    json:async()=>modo==='vazio'?[]:modo==='erro'?{message:'Falha simulada'}:modo==='outra'?dados.map(x=>({...x,solicitacao_id:8})):dados};},
  formatarData:()=> '08/11/2026',mensagemDeErro:e=>e.message
 };
 await new Function(...Object.keys(deps),'botao','id',codigo+';return consultarHistoricoFiscalizacaoMandato(id,botao);')(...Object.values(deps),botao,7);
 assert.equal(botao.disabled,false,'Botao reabilitado');
 assert.equal(chamadas.length,modo==='sessao'?0:1,'Consulta sem gravacao');
 if(chamadas.length){
  assert.equal(chamadas[0].options.method,undefined,'Somente GET');
  assert.match(chamadas[0].url,/solicitacao_id=eq.7/);
  assert.match(chamadas[0].url,/order=registrado_em.desc/);
 }
 if(modo==='ok'){
  assert.equal(destino.children.length,1);
  assert.equal(destino.children[0].tag,'ol');
  assert.equal(destino.children[0].children.length,1);
  assert.match(destino.children[0].children[0].textContent,/<img src=x onerror=alert\(1\)>/);
  assert.equal(destino.children[0].children[0].innerHTML,undefined,'Sem insercao HTML');
 }else if(modo==='vazio')assert.match(destino.textContent,/Nenhum registro/);
 else if(modo==='outra'){assert.match(destino.textContent,/outra solicitação/);assert.equal(destino.children.length,0);}
 else if(modo==='erro')assert.match(destino.textContent,/Erro ao consultar histórico/);
 else assert.match(destino.textContent,/Sessão expirada/);
}
(async()=>{for(const modo of ['ok','vazio','erro','sessao','outra'])await caso(modo);
 console.log('OK: 5 cenarios de consulta segura do historico');})().catch(e=>{console.error(e);process.exitCode=1});
