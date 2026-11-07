// node painel/tests/historico-auditavel.test.cjs
// Rede 100% simulada: não acessa Supabase nem altera solicitações.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('async function registrarHistoricoFiscalizacaoMandato(');
const end=html.indexOf('async function consultarHistoricoFiscalizacaoMandato(',start);
assert.ok(start>=0&&end>start,'Função de histórico não encontrada');
const source=html.slice(start,end);
async function run(mode){
 const alerts=[],calls=[],button={disabled:false},box={textContent:''};
 const prompts=['cobranca','Cobrança de teste sem dados pessoais','TESTE-001'];
 const record={id:99,solicitacao_id:7,tipo:'cobranca',descricao:prompts[1],protocolo_referencia:prompts[2]};
 const mocks={
  prompt:()=>prompts.shift(),normalizar:s=>s.toLowerCase(),confirm:()=>mode!=='cancel',
  alert:s=>alerts.push(s),document:{getElementById:()=>box},
  obterSessaoValida:async()=>mode==='expired'?null:{access_token:'fake'},
  SUPABASE_URL:'https://example.invalid',SUPABASE_KEY:'fake',
  requisicao:async(url,opts)=>{
   calls.push({url,opts});
   if(mode==='network'&&calls.length===1)throw Error('Falha de rede');
   if(mode==='readfail'&&calls.length===2)throw Error('Falha de leitura');
   const data=mode==='mismatch'&&calls.length===2?{...record,protocolo_referencia:'OUTRO'}:record;
   return {ok:true,json:async()=>[data]};
  },mensagemDeErro:e=>e.message
 };
 await new Function(...Object.keys(mocks),'button',source+';return registrarHistoricoFiscalizacaoMandato(7,button);')(...Object.values(mocks),button);
 assert.equal(button.disabled,false,'Botão não foi reabilitado');
 const expectedCalls=mode==='cancel'||mode==='expired'?0:mode==='network'?1:2;
 assert.equal(calls.length,expectedCalls,mode);
 if(calls.length){
  assert.equal(calls[0].opts.method,'POST');
  assert.deepEqual(JSON.parse(calls[0].opts.body),{solicitacao_id:7,tipo:'cobranca',descricao:'Cobrança de teste sem dados pessoais',protocolo_referencia:'TESTE-001'});
 }
 if(mode==='ok'){
  assert.match(alerts.at(-1),/registrada e confirmada/);
  assert.match(calls[1].url,/id=eq.99/);
  assert.match(box.textContent,/Registro confirmado/);
 } else if(mode==='mismatch'||mode==='readfail') assert.match(alerts.at(-1),/antes de repetir|antes de tentar novamente/);
 else if(mode==='network')assert.match(alerts.at(-1),/gravação pode ter ocorrido/);
 else if(mode==='expired')assert.match(alerts.at(-1),/Sessão expirada/);
 else assert.equal(alerts.length,0);
}
(async()=>{for(const mode of ['ok','mismatch','readfail','network','expired','cancel'])await run(mode);console.log('OK: 6 cenários simulados de histórico auditável');})().catch(e=>{console.error(e);process.exitCode=1;});
