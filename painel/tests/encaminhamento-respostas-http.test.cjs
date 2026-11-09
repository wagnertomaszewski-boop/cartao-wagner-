// node painel/tests/encaminhamento-respostas-http.test.cjs
// Exercita a funcao real com respostas HTTP simuladas. Nenhuma chamada externa.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('async function salvarEncaminhamentoPrefeitura(');
const end=html.indexOf('async function registrarHistoricoFiscalizacaoMandato(',start);
assert.ok(start>=0&&end>start,'Funcao de encaminhamento nao localizada');
const helper=html.slice(html.indexOf('function diasEntreDatasCivisMandato('),html.indexOf('function diasDesdeEncaminhamentoMandato('));
const source=helper+html.slice(start,end);
async function scenario(mode){
 const calls=[],alerts=[],button={disabled:false};
 const saved={id:7,encaminhado_prefeitura_em:'2026-11-07',protocolo_prefeitura:'TEST-001'};
 const mocks={
  document:{getElementById:id=>({'encaminhado-prefeitura-7':{value:'2026-11-07'},'protocolo-prefeitura-7':{value:'TEST-001'}})[id]},
  dataHojeISO:()=> '2026-11-07',alert:msg=>alerts.push(msg),confirm:()=>true,
  obterSessaoValida:async()=>({access_token:'fake'}),
  SUPABASE_URL:'https://example.invalid',SUPABASE_KEY:'fake',
  requisicao:async(url,options)=>{
   calls.push({url,options});
   if(calls.length===1){
    if(mode==='http403')return {ok:false,json:async()=>({message:'Acesso negado'})};
    if(mode==='emptyPatch')return {ok:true,json:async()=>[]};
    if(mode==='wrongPatch')return {ok:true,json:async()=>[{...saved,protocolo_prefeitura:'OUTRO'}]};
    return {ok:true,json:async()=>[saved]};
   }
   if(mode==='read403')return {ok:false,json:async()=>({message:'Leitura negada'})};
   if(mode==='emptyRead')return {ok:true,json:async()=>[]};
   if(mode==='wrongRead')return {ok:true,json:async()=>[{...saved,protocolo_prefeitura:'OUTRO'}]};
   throw Error('Consulta inesperada');
  },
  carregarSolicitacoes:async()=>{throw Error('Nao deveria recarregar')},
  atualizarContadoresStatus:async()=>{throw Error('Nao deveria atualizar')},
  mensagemDeErro:e=>e.message
 };
 await new Function(...Object.keys(mocks),'button',source+';return salvarEncaminhamentoPrefeitura(7,button);')(...Object.values(mocks),button);
 assert.equal(button.disabled,false,mode);
 assert.equal(calls.length,['http403','emptyPatch','wrongPatch'].includes(mode)?1:2,mode);
 assert.equal(calls[0].options.method,'PATCH',mode);
 assert.ok(!calls.some(c=>c.options.method==='POST'),mode);
 assert.equal(alerts.length,1,mode);
 assert.doesNotMatch(alerts[0],/salvos com sucesso/,mode);
 if(mode==='http403')assert.match(alerts[0],/Acesso negado/);
 if(mode==='emptyPatch')assert.match(alerts[0],/confirmar a gravação/);
 if(mode==='wrongPatch')assert.match(alerts[0],/servidor não confirmou/);
 if(['read403','emptyRead','wrongRead'].includes(mode))assert.match(alerts[0],/leitura de confirmação falhou/);
}
(async()=>{for(const mode of ['http403','emptyPatch','wrongPatch','read403','emptyRead','wrongRead'])await scenario(mode);console.log('OK: 6 cenarios de respostas HTTP simuladas');})().catch(e=>{console.error(e);process.exitCode=1;});
