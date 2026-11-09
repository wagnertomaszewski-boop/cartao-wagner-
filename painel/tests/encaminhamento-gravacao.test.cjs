// Testes isolados: node painel/tests/encaminhamento-gravacao.test.cjs
// Executa a função real do HTML com rede simulada. Nenhum dado real é alterado.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('async function salvarEncaminhamentoPrefeitura(');
const end=html.indexOf('async function registrarHistoricoFiscalizacaoMandato(',start);
assert.ok(start>=0&&end>start,'Função de gravação não encontrada');
const helper=html.slice(html.indexOf('function diasEntreDatasCivisMandato('),html.indexOf('function diasDesdeEncaminhamentoMandato('));
const source=helper+html.slice(start,end);
async function scenario(mode){
  const calls=[],alerts=[],button={disabled:false};
  const fields={'encaminhado-prefeitura-7':{value:'2026-11-07'},'protocolo-prefeitura-7':{value:'PREF-TEST-001'}};
  const saved={id:7,encaminhado_prefeitura_em:'2026-11-07',protocolo_prefeitura:'PREF-TEST-001'};
  const mocks={
    document:{getElementById:id=>fields[id]},dataHojeISO:()=> '2026-11-07',
    alert:msg=>alerts.push(msg),confirm:()=>true,
    obterSessaoValida:async()=>({access_token:'fake-token'}),
    SUPABASE_URL:'https://example.invalid',SUPABASE_KEY:'fake-key',
    requisicao:async(url,options)=>{
      calls.push({url,options});
      const data=mode==='mismatch'&&calls.length===2?{...saved,protocolo_prefeitura:'DIVERGENTE'}:saved;
      return {ok:true,json:async()=>[data]};
    },
    carregarSolicitacoes:async()=>{},atualizarContadoresStatus:async()=>{},
    mensagemDeErro:e=>e.message
  };
  await new Function(...Object.keys(mocks),'button',source+';return salvarEncaminhamentoPrefeitura(7,button);')(...Object.values(mocks),button);
  assert.equal(calls.length,2,'Deve gravar e consultar novamente');
  assert.equal(calls[0].options.method,'PATCH');
  assert.equal(calls[1].options.method,undefined);
  assert.match(calls[1].url,/select=id,encaminhado_prefeitura_em,protocolo_prefeitura/);
  assert.deepEqual(JSON.parse(calls[0].options.body),{encaminhado_prefeitura_em:'2026-11-07',protocolo_prefeitura:'PREF-TEST-001'});
  assert.equal(button.disabled,false,'Botão deve ser reabilitado');
  if(mode==='mismatch')assert.match(alerts.at(-1),/leitura de confirmação falhou/);
  else assert.match(alerts.at(-1),/salvos com sucesso/);
}
(async()=>{await scenario('ok');await scenario('mismatch');console.log('OK: gravação e leitura simuladas, divergência detectada, botão liberado.');})().catch(e=>{console.error(e);process.exitCode=1;});
