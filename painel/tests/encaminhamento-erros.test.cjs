// Execute: node painel/tests/encaminhamento-erros.test.cjs
// Usa a função real do painel com rede inteiramente simulada. Sem dados reais.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const begin=html.indexOf('async function salvarEncaminhamentoPrefeitura(');
const end=html.indexOf('async function registrarHistoricoFiscalizacaoMandato(',begin);
assert.ok(begin>=0&&end>begin,'Função de encaminhamento não localizada');
const helper=html.slice(html.indexOf('function diasEntreDatasCivisMandato('),html.indexOf('function diasDesdeEncaminhamentoMandato('));
const source=helper+html.slice(begin,end);
async function test(mode){
  const alerts=[],calls=[],button={disabled:false};
  const fields={
    'encaminhado-prefeitura-7':{value:mode==='missingDate'||mode==='empty'?'':mode==='future'?'2026-12-01':'2026-11-07'},
    'protocolo-prefeitura-7':{value:mode==='empty'?'':mode==='long'?'X'.repeat(121):'TEST-001'}
  };
  const mocks={
    document:{getElementById:id=>fields[id]},dataHojeISO:()=> '2026-11-07',
    alert:message=>alerts.push(message),confirm:()=>mode!=='cancel',
    obterSessaoValida:async()=>mode==='expired'?null:{access_token:'fake-token'},
    SUPABASE_URL:'https://example.invalid',SUPABASE_KEY:'fake-key',
    requisicao:async(url,options)=>{calls.push({url,options});throw new Error('Rede indisponível');},
    carregarSolicitacoes:async()=>{throw new Error('Não deveria recarregar');},
    atualizarContadoresStatus:async()=>{throw new Error('Não deveria atualizar');},
    mensagemDeErro:error=>error.message
  };
  await new Function(...Object.keys(mocks),'button',source+';return salvarEncaminhamentoPrefeitura(7,button);')(...Object.values(mocks),button);
  assert.equal(button.disabled,false,'Botão deve permanecer disponível');
  assert.equal(calls.length,mode==='network'?1:0,'Não deve enviar gravação inválida');
  const expected={
    future:/inválida ou futura/,missingDate:/Informe também a data/,
    empty:/Não é permitido apagar/,long:/no máximo 120/,expired:/Sessão expirada/,
    network:/Rede indisponível/
  };
  if(mode==='cancel')assert.equal(alerts.length,0,'Cancelamento silencioso');
  else assert.match(alerts.at(-1),expected[mode]);
}
(async()=>{
  for(const mode of ['future','missingDate','empty','long','cancel','expired','network'])await test(mode);
  console.log('OK: 7 cenários de validação, cancelamento, sessão e rede.');
})().catch(error=>{console.error(error);process.exitCode=1;});
