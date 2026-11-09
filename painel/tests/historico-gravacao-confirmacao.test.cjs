// Regressao isolada: node painel/tests/historico-gravacao-confirmacao.test.cjs
// Executa a funcao real do painel; rede e DOM simulados, sem dados de cidadaos.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('async function registrarHistoricoFiscalizacaoMandato(');
const end=html.indexOf('async function consultarHistoricoFiscalizacaoMandato(',start);
assert.ok(start>=0&&end>start,'Funcao de registro do historico nao encontrada');
const source=html.slice(start,end);
async function scenario(mode){
  const calls=[],alerts=[],button={disabled:false};
  const row={id:41,solicitacao_id:7,tipo:'cobranca',descricao:'Cobrança formal enviada',protocolo_referencia:'PREF-007'};
  const prompts=['cobranca','Cobrança formal enviada','PREF-007'];
  const mocks={
    prompt:()=>prompts.shift(),confirm:()=>true,alert:m=>alerts.push(m),
    normalizar:s=>s.trim().toLowerCase(),
    obterSessaoValida:async()=>mode==='noSession'?null:{access_token:'fake'},
    SUPABASE_URL:'https://example.invalid',SUPABASE_KEY:'fake',
    document:{getElementById:()=>({textContent:''})},
    requisicao:async(url,options)=>{
      calls.push({url,options});
      if(mode==='network'&&calls.length===1)throw Error('Conexao interrompida');
      if(calls.length===1)return {ok:mode!=='denied',status:mode==='denied'?403:201,
        json:async()=>mode==='denied'?{message:'Acesso negado'}:mode==='empty'?[]:[row]};
      return {ok:mode!=='readDenied',status:mode==='readDenied'?403:200,
        json:async()=>mode==='mismatch'?[{...row,descricao:'Divergente'}]:[row]};
    },
    mensagemDeErro:e=>e.message
  };
  await new Function(...Object.keys(mocks),'botao','id',source+';return registrarHistoricoFiscalizacaoMandato(id,botao);')(...Object.values(mocks),button,7);
  assert.equal(button.disabled,false,'Botao deve ser reabilitado');
  assert.equal(calls.length,mode==='noSession'?0:['network','denied','empty'].includes(mode)?1:2);
  if(calls.length){
    assert.equal(calls[0].options.method,'POST');
    assert.deepEqual(JSON.parse(calls[0].options.body),{
      solicitacao_id:7,tipo:'cobranca',descricao:'Cobrança formal enviada',protocolo_referencia:'PREF-007'});
  }
  if(calls.length===2){
    assert.equal(calls[1].options.method,undefined,'Confirmacao deve ser GET');
    assert.match(calls[1].url,/id=eq.41/);
  }
  assert.equal(alerts.length,1);
  if(mode==='ok')assert.match(alerts[0],/registrada e confirmada/);
  else{
    assert.doesNotMatch(alerts[0],/registrada e confirmada/);
    if(['network','readDenied','mismatch'].includes(mode))assert.match(alerts[0],/antes de (tentar novamente|repetir)/);
  }
}
(async()=>{for(const mode of ['ok','noSession','network','denied','empty','readDenied','mismatch'])await scenario(mode);
 console.log('OK: 7 cenarios isolados de gravacao auditavel e confirmacao');})().catch(e=>{console.error(e);process.exitCode=1});
