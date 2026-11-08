// node painel/tests/encaminhamento-id-canonico.test.cjs
// Usa a funcao real do painel e impede qualquer chamada de rede.
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const inicio=html.indexOf('async function salvarEncaminhamentoPrefeitura(');
const fim=html.indexOf('async function registrarHistoricoFiscalizacaoMandato(',inicio);
assert.ok(inicio>=0&&fim>inicio,'Funcao nao localizada');
const codigo=html.slice(inicio,fim);
async function testar(id,aceito){
 const avisos=[];let rede=0;
 const deps={
  document:{getElementById:()=>({value:'2026-11-07'})},
  alert:s=>avisos.push(s),confirm:()=>false,
  dataHojeISO:()=> '2026-11-08',diasEntreDatasCivisMandato:()=>1,
  obterSessaoValida:async()=>null,
  requisicao:async()=>{rede++;throw Error('Rede proibida neste teste')},
  SUPABASE_URL:'https://example.invalid',SUPABASE_KEY:'fake'
 };
 const botao={disabled:false};
 await new Function(...Object.keys(deps),'id','botao',codigo+';return salvarEncaminhamentoPrefeitura(id,botao);')(...Object.values(deps),id,botao);
 assert.equal(rede,0,'Nao deve acessar rede');
 assert.equal(botao.disabled,false);
 if(aceito)assert.equal(avisos.length,0,'ID valido deve chegar ate confirmacao simulada');
 else assert.equal(avisos[0],'Identificador da solicitação inválido.');
}
(async()=>{
 for(const id of [0,-1,1.5,'1e2',' 7 ','07','0','-1',Number.MAX_SAFE_INTEGER+1])await testar(id,false);
 for(const id of [7,'7'])await testar(id,true);
 console.log('OK: 11 casos de validacao de ID, sem rede');
})().catch(e=>{console.error(e);process.exitCode=1});
