// Execute: node painel/tests/filtro-prazos-isolado.test.cjs
// Testa a funcao real com DOM simulado, sem rede ou banco de dados.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const inicio=html.indexOf('function filtrarPrazoMandato(');
const fim=html.indexOf('async function carregarSolicitacoes(',inicio);
assert.ok(inicio>=0&&fim>inicio,'Funcao de filtro nao encontrada');
const codigo=html.slice(inicio,fim);
const executar=new Function('faixa','document','irPainel','resultado',
  codigo+';let filtroPrazoMandato=0,faixaSemMovimento=10;filtrarPrazoMandato(faixa);resultado.filtro=filtroPrazoMandato;resultado.semMovimento=faixaSemMovimento;');
for(const [entrada,esperado] of [[-1,-1],[0,0],[30,30],[60,60],[90,90],[180,180],[999,0]]){
  const campos={filtroStatus:{value:'Pendente'},filtroBusca:{value:'texto anterior'}};
  const navegacoes=[];
  const resultado={};
  executar(entrada,{getElementById:id=>campos[id]||null},(...args)=>navegacoes.push(args),resultado);
  assert.equal(resultado.filtro,esperado,'Faixa '+entrada);
  assert.equal(resultado.semMovimento,0);
  assert.deepEqual(navegacoes,[['solicitacoes',null,true]]);
  if(esperado!==0){
    assert.equal(campos.filtroStatus.value,'Todos');
    assert.equal(campos.filtroBusca.value,'');
  }else{
    assert.equal(campos.filtroStatus.value,'Pendente');
    assert.equal(campos.filtroBusca.value,'texto anterior');
  }
}
console.log('OK: 7 cenarios isolados de selecao de filtros de prazo.');
