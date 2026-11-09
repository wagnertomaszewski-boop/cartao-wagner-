// Regressao isolada da interface: node painel/tests/fiscalizacao-entrada-seguranca.test.cjs
// Nao acessa rede nem dados reais; extrai a funcao efetiva do painel.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const begin=html.indexOf('async function registrarHistoricoFiscalizacaoMandato(');
const finish=html.indexOf('async function consultarHistoricoFiscalizacaoMandato(',begin);
assert.ok(begin>=0&&finish>begin,'Funcao de fiscalizacao nao encontrada');
const source=html.slice(begin,finish);
async function run({id=7,disabled=false,inputs=[],approve=true}={}){
 const alerts=[],calls=[],button={disabled};
 let sessionChecks=0;
 const env={
  alert:m=>alerts.push(String(m)),
  prompt:()=>inputs.shift()??null,
  confirm:()=>approve,
  normalizar:s=>String(s).trim().toLowerCase(),
  obterSessaoValida:async()=>{sessionChecks++;return {access_token:'mock'}},
  requisicao:async(...args)=>{calls.push(args);throw Error('rede simulada indisponivel')},
  SUPABASE_URL:'https://example.invalid',SUPABASE_KEY:'mock',
  mensagemDeErro:e=>e.message,
  document:{getElementById:()=>null}
 };
 await new Function(...Object.keys(env),'id','botao',source+';return registrarHistoricoFiscalizacaoMandato(id,botao);')(...Object.values(env),id,button);
 return {alerts,calls,button,sessionChecks};
}
(async()=>{
 for(const id of [0,-1,'1 OR 1=1','7.5','1e3',Number.MAX_SAFE_INTEGER+1]){
  const r=await run({id});
  assert.equal(r.calls.length,0,'ID invalido nao pode enviar');
  assert.equal(r.sessionChecks,0,'ID invalido nao pode autenticar');
  assert.match(r.alerts[0],/inválido/);
 }
 const busy=await run({disabled:true});
 assert.equal(busy.calls.length,0);
 assert.equal(busy.alerts.length,0);
 const invalidType=await run({inputs:['exclusao']});
 assert.equal(invalidType.calls.length,0);
 assert.match(invalidType.alerts[0],/Tipo inválido/);
 const short=await run({inputs:['cobranca','abcd']});
 assert.equal(short.calls.length,0);
 assert.match(short.alerts[0],/entre 5 e 2000/);
 const longProtocol=await run({inputs:['cobranca','Cobrança registrada','X'.repeat(121)]});
 assert.equal(longProtocol.calls.length,0);
 assert.match(longProtocol.alerts[0],/até 120/);
 const cancelled=await run({inputs:['cobranca','Cobrança registrada','PREF-001'],approve:false});
 assert.equal(cancelled.calls.length,0);
 assert.equal(cancelled.sessionChecks,0);
 console.log('OK: IDs invalidos, clique duplicado, tipo, descricao, protocolo e cancelamento');
})().catch(e=>{console.error(e);process.exitCode=1});
