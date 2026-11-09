// Regressão dos indicadores reais do painel, sem rede ou banco.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../../painel/index.html',import.meta.url),'utf8');
function extrair(inicio,fim){
 const a=html.indexOf(inicio),b=html.indexOf(fim,a+inicio.length);
 assert.ok(a>=0&&b>a,'Trecho de implementação ausente: '+inicio);
 return html.slice(a,b);
}
const fonte=extrair('function diasEntreDatasCivisMandato(','\nfunction diasDesdeEncaminhamentoMandato(')
 + '\n' + extrair('function atualizarResumoPainel(','\nfunction salvarSessao(');
const hoje='2026-11-08';
function renderizar(itens){
 const elementos=new Map();
 const ctx=vm.createContext({
  Date,Math,Array,String,Number,
  dataHojeISO:()=>hoje,
  normalizar:s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),
  document:{getElementById:id=>{
   if(!elementos.has(id))elementos.set(id,{textContent:'',innerHTML:''});
   return elementos.get(id);
  }}
 });
 vm.runInContext(fonte,ctx,{timeout:1000});
 ctx.atualizarResumoPainel(itens);
 return elementos.get('alertasPrazoResumo').innerHTML;
}
function diasAtras(n){return new Date(Date.parse(hoje+'T00:00:00Z')-n*86400000).toISOString().slice(0,10);}
function registro(n,status='Em andamento'){return {status,encaminhado_prefeitura_em:diasAtras(n)};}
test('limites 29/30, 59/60, 89/90, 179/180 são exclusivos',()=>{
 const html=renderizar([29,30,59,60,89,90,179,180,181].map(n=>registro(n)));
 for(const trecho of ['30–59 dias: 2','60–89 dias: 2','90–179 dias: 2','180+ dias: 2'])
  assert.ok(html.includes(trecho),trecho);
});
test('concluídas não geram alerta e abertas sem data são separadas',()=>{
 const html=renderizar([registro(181,'Concluído'),{status:'Recebida'},registro(30)]);
 assert.ok(html.includes('30–59 dias: 1'));
 assert.ok(html.includes('180+ dias: 0'));
 assert.ok(html.includes('Sem data oficial: 1'));
});
test('sem itens não inventa alertas',()=>{
 const html=renderizar([]);
 for(const trecho of ['30–59 dias: 0','60–89 dias: 0','90–179 dias: 0','180+ dias: 0','Sem data oficial: 0'])
  assert.ok(html.includes(trecho),trecho);
});
