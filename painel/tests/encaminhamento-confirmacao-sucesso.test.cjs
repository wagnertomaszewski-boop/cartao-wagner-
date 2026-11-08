// node painel/tests/encaminhamento-confirmacao-sucesso.test.cjs
// Fluxo real extraido do painel, com rede e sessao simuladas. Sem acesso a producao.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const inicio=html.indexOf('async function salvarEncaminhamentoPrefeitura(');
const fim=html.indexOf('async function registrarHistoricoFiscalizacaoMandato(',inicio);
assert.ok(inicio>=0&&fim>inicio,'Funcao de encaminhamento nao localizada');
const codigo=html.slice(inicio,fim);
async function executar(modo){
 const chamadas=[],avisos=[],botao={disabled:false};
 let recargas=0,contadores=0;
 const registro={id:7,encaminhado_prefeitura_em:'2026-11-07',protocolo_prefeitura:'TEST-001'};
 const dependencias={
  document:{getElementById:id=>({'encaminhado-prefeitura-7':{value:'2026-11-07'},'protocolo-prefeitura-7':{value:'TEST-001'}})[id]},
  dataHojeISO:()=> '2026-11-07',alert:s=>avisos.push(s),confirm:()=>true,
  obterSessaoValida:async()=>({access_token:'fake'}),
  SUPABASE_URL:'https://example.invalid',SUPABASE_KEY:'fake',
  requisicao:async(url,options)=>{
   chamadas.push({url,options});
   const resposta=modo==='divergente'&&chamadas.length===2?{...registro,protocolo_prefeitura:'OUTRO'}:registro;
   return {ok:true,json:async()=>[resposta]};
  },
  carregarSolicitacoes:async()=>{recargas++},
  atualizarContadoresStatus:async()=>{contadores++},
  mensagemDeErro:e=>e.message
 };
 await new Function(...Object.keys(dependencias),'botao',codigo+';return salvarEncaminhamentoPrefeitura(7,botao);')(...Object.values(dependencias),botao);
 assert.equal(botao.disabled,false,'Botao deve voltar a habilitar');
 assert.equal(chamadas.length,2,'PATCH seguido de GET');
 assert.equal(chamadas[0].options.method,'PATCH');
 assert.deepEqual(JSON.parse(chamadas[0].options.body),{encaminhado_prefeitura_em:'2026-11-07',protocolo_prefeitura:'TEST-001'});
 assert.match(chamadas[1].url,/select=id,encaminhado_prefeitura_em,protocolo_prefeitura/);
 assert.equal(chamadas[1].options.method,undefined,'Leitura deve usar GET');
 if(modo==='sucesso'){
  assert.match(avisos[0],/salvos com sucesso/);
  assert.equal(recargas,1);
  assert.equal(contadores,1);
 }else{
  assert.doesNotMatch(avisos[0],/salvos com sucesso/);
  assert.match(avisos[0],/leitura de confirmação falhou/);
  assert.equal(recargas,0);
  assert.equal(contadores,0);
 }
}
(async()=>{await executar('sucesso');await executar('divergente');console.log('OK: 2 cenarios simulados de confirmacao independente');})().catch(e=>{console.error(e);process.exitCode=1});
