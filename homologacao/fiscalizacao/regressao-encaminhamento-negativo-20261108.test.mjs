// Testes negativos isolados: somente mocks, sem rede, banco ou dados reais.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../../painel/index.html',import.meta.url),'utf8');
const inicio=html.indexOf('async function salvarEncaminhamentoPrefeitura(');
const fim=html.indexOf('\nasync function registrarHistoricoFiscalizacaoMandato(',inicio);
assert.ok(inicio>=0 && fim>inicio,'Fluxo de encaminhamento não encontrado');
const fonte=html.slice(inicio,fim);
function preparar({sessao=true,escritaOk=true,leituraOk=true,data='2026-11-07',protocolo='PREF-TESTE'}={}){
 const avisos=[],chamadas=[];
 const registro={id:123,encaminhado_prefeitura_em:data,protocolo_prefeitura:protocolo};
 const contexto=vm.createContext({
  String,Number,Error,encodeURIComponent,
  SUPABASE_URL:'https://backend-ficticio.invalid',SUPABASE_KEY:'chave-publica-ficticia',
  document:{getElementById:id=>({value:id.startsWith('encaminhado')?data:protocolo})},
  dataHojeISO:()=> '2026-11-08',
  diasEntreDatasCivisMandato:(a,b)=>a>b?-1:1,
  confirm:()=>true,alert:m=>avisos.push(m),mensagemDeErro:e=>e.message,
  obterSessaoValida:async()=>sessao?{access_token:'token-sintetico'}:null,
  requisicao:async(url,opcoes)=>{
   chamadas.push({url,opcoes});
   const primeira=chamadas.length===1;
   return {ok:primeira?escritaOk:true,json:async()=>[primeira?registro:(leituraOk?registro:{...registro,protocolo_prefeitura:'DIVERGENTE'})]};
  },
  carregarSolicitacoes:async()=>{},atualizarContadoresStatus:async()=>{}
 });
 vm.runInContext(fonte,contexto);
 return {avisos,chamadas,executar:async()=>{const botao={disabled:false};await contexto.salvarEncaminhamentoPrefeitura(123,botao);assert.equal(botao.disabled,false);}};
}
test('sem sessão administrativa não tenta escrever nem anuncia sucesso',async()=>{
 const t=preparar({sessao:false});await t.executar();
 assert.equal(t.chamadas.length,0);assert.ok(t.avisos.includes('Sessão expirada.'));
 assert.ok(!t.avisos.includes('Dados do encaminhamento salvos com sucesso.'));
});
test('leitura divergente após PATCH não anuncia sucesso',async()=>{
 const t=preparar({leituraOk:false});await t.executar();
 assert.equal(t.chamadas.length,2);
 assert.match(t.avisos.join(' '),/leitura de confirmação falhou/);
 assert.ok(!t.avisos.includes('Dados do encaminhamento salvos com sucesso.'));
});
test('falha de escrita não dispara leitura nem sucesso',async()=>{
 const t=preparar({escritaOk:false});await t.executar();
 assert.equal(t.chamadas.length,1);
 assert.ok(!t.avisos.includes('Dados do encaminhamento salvos com sucesso.'));
});
test('data futura bloqueia PATCH antes da autenticação',async()=>{
 const t=preparar({data:'2026-11-09'});await t.executar();
 assert.equal(t.chamadas.length,0);
 assert.match(t.avisos.join(' '),/inválida ou futura/);
});
