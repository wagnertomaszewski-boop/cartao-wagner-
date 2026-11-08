// node painel/tests/encaminhamento-identidade-confirmacao.test.cjs
// Usa a funcao real do painel, com requisicoes simuladas. Nunca acessa producao.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const a=html.indexOf('async function salvarEncaminhamentoPrefeitura(');
const b=html.indexOf('async function registrarHistoricoFiscalizacaoMandato(',a);
assert.ok(a>=0&&b>a,'Funcao de encaminhamento ausente');
const codigo=html.slice(a,b);
async function testar(modo){
 let chamadas=0,recargas=0;const avisos=[],botao={disabled:false};
 const registro={id:7,encaminhado_prefeitura_em:'2026-11-07',protocolo_prefeitura:'TEST-001'};
 const deps={
  document:{getElementById:id=>({'encaminhado-prefeitura-7':{value:'2026-11-07'},'protocolo-prefeitura-7':{value:'TEST-001'}})[id]},
  dataHojeISO:()=> '2026-11-07',diasEntreDatasCivisMandato:()=>0,
  alert:s=>avisos.push(s),confirm:()=>true,obterSessaoValida:async()=>({access_token:'fake'}),
  SUPABASE_URL:'https://example.invalid',SUPABASE_KEY:'fake',
  requisicao:async()=>{
   chamadas++;
   const retorno={...registro};
   if(modo==='patch_id'&&chamadas===1||modo==='get_id'&&chamadas===2)retorno.id=8;
   if(modo==='get_protocolo'&&chamadas===2)retorno.protocolo_prefeitura='DIVERGENTE';
   return {ok:!(modo==='get_erro'&&chamadas===2),json:async()=>[retorno]};
  },
  carregarSolicitacoes:async()=>{recargas++},
  atualizarContadoresStatus:async()=>{},mensagemDeErro:e=>e.message
 };
 await new Function(...Object.keys(deps),'botao',codigo+';return salvarEncaminhamentoPrefeitura(7,botao);')(...Object.values(deps),botao);
 const sucesso=avisos.some(s=>s.includes('salvos com sucesso'));
 assert.equal(sucesso,modo==='sucesso',modo);
 assert.equal(recargas,modo==='sucesso'?1:0,modo);
 assert.equal(chamadas,modo==='patch_id'?1:2,modo);
 assert.equal(botao.disabled,false,modo);
}
(async()=>{
 for(const modo of ['sucesso','patch_id','get_id','get_protocolo','get_erro'])await testar(modo);
 console.log('OK: 5 cenarios de confirmacao, identidade e falha de leitura (rede simulada)');
})().catch(e=>{console.error(e);process.exitCode=1});
