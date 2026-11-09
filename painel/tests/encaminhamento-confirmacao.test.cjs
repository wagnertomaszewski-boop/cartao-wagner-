// Regressão isolada do encaminhamento oficial: node painel/tests/encaminhamento-confirmacao.test.cjs
// Executa a função do HTML real com rede/DOM simulados; não acessa produção.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('async function salvarEncaminhamentoPrefeitura(');
const end=html.indexOf('async function registrarHistoricoFiscalizacaoMandato(',start);
assert.ok(start>=0&&end>start,'Função de encaminhamento não encontrada');
const source=html.slice(start,end);
async function scenario(mode){
  const alerts=[],calls=[],button={disabled:false};
  const data=mode==='future'?'2026-11-10':'2026-11-09';
  const fields={'encaminhado-prefeitura-7':{value:data},'protocolo-prefeitura-7':{value:'PREF-2026-007'}};
  const row={id:7,encaminhado_prefeitura_em:data,protocolo_prefeitura:'PREF-2026-007'};
  let refresh=0;
  const mocks={
    document:{getElementById:id=>fields[id]},
    dataHojeISO:()=> '2026-11-09',
    diasEntreDatasCivisMandato:(a,b)=>a>b?-1:0,
    alert:m=>alerts.push(m),confirm:()=>mode!=='cancel',
    obterSessaoValida:async()=>mode==='noSession'?null:{access_token:'fake'},
    requisicao:async(url,options)=>{
      calls.push({url,options});
      if(calls.length===1)return {ok:mode!=='writeDenied',json:async()=>mode==='writeDenied'?{message:'Negado'}:[row]};
      return {ok:mode!=='readDenied',json:async()=>mode==='mismatch'?[{...row,protocolo_prefeitura:'OUTRO'}]:[row]};
    },
    SUPABASE_URL:'https://example.invalid',SUPABASE_KEY:'fake',
    carregarSolicitacoes:async()=>{refresh++},
    atualizarContadoresStatus:async()=>{},
    mensagemDeErro:e=>e.message
  };
  await new Function(...Object.keys(mocks),'id','botao',source+';return salvarEncaminhamentoPrefeitura(id,botao);')(...Object.values(mocks),7,button);
  assert.equal(button.disabled,false,'Botão deve ser reabilitado');
  const expected={future:0,cancel:0,noSession:0,writeDenied:1,readDenied:2,mismatch:2,ok:2}[mode];
  assert.equal(calls.length,expected,mode);
  if(calls.length){
    assert.equal(calls[0].options.method,'PATCH');
    assert.deepEqual(JSON.parse(calls[0].options.body),{encaminhado_prefeitura_em:data,protocolo_prefeitura:'PREF-2026-007'});
  }
  if(calls.length===2){
    assert.equal(calls[1].options.method,undefined,'Confirmação deve usar GET');
    assert.match(calls[1].url,/select=id,encaminhado_prefeitura_em,protocolo_prefeitura/);
  }
  assert.equal(refresh,mode==='ok'?1:0);
  if(mode==='ok')assert.match(alerts.join(' '),/salvos com sucesso/);
  else assert.doesNotMatch(alerts.join(' '),/salvos com sucesso/);
}
(async()=>{for(const mode of ['ok','future','cancel','noSession','writeDenied','readDenied','mismatch'])await scenario(mode);
console.log('OK: 7 cenários isolados de encaminhamento e confirmação');})().catch(e=>{console.error(e);process.exitCode=1});
