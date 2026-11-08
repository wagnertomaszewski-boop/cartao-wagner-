import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criarConsultaSegura} from '../../v2/seguranca/consulta-segura.mjs';

// Contrato compartilhado das três telas, antes da ativação em produção.
const paginas=[
 ['v2/index.html','SEGURANCA_V2_ATIVA','API_SEGURANCA_V2','./seguranca/consulta-segura.mjs'],
 ['v2/acompanhar.html','CONSULTA_SEGURA_ACOMPANHAR_V2_ATIVA','API_CONSULTA_SEGURA_ACOMPANHAR_V2','./seguranca/consulta-segura.mjs'],
 ['acompanhar.html','CONSULTA_SEGURA_LEGADO_ATIVA','API_CONSULTA_SEGURA_LEGADO','./v2/seguranca/consulta-segura.mjs']
];
for(const [pagina,flag,api,modulo] of paginas){
 test(pagina+' mantém migração desligada e módulo HTTPS preparado',()=>{
  const html=readFileSync(new URL('../../'+pagina,import.meta.url),'utf8');
  assert.ok(html.includes(flag+'=false')||html.includes(flag+' = false'));
  assert.ok(html.includes(api+"=''")||html.includes(api+" = ''"));
  assert.ok(html.includes(modulo));
  assert.ok(html.includes('criarConsultaSegura'));
  assert.ok(html.includes('.consultar({protocolo'));
  assert.ok(html.includes("textContent"));
  assert.ok(html.includes('value=\'\'')||html.includes("value = ''"));
 });
}
test('contrato da API segura é compatível com os campos usados nas páginas',async()=>{
 let pedidos=0;
 const cliente=criarConsultaSegura({apiBase:'https://homologacao.example/',buscar:async(url,op)=>{
  pedidos++;
  assert.equal(url,'https://homologacao.example/api/solicitacoes/consultar');
  assert.deepEqual(JSON.parse(op.body),{protocolo:'PROTO-TESTE',chave:'c'.repeat(64)});
  return {ok:true,json:async()=>({
   resultado:[{assunto:'Assunto sintético',status:'Em análise'}],
   respostas:[{texto:'Resposta sintética',criado_em:'2026-11-07'}],
   historico:[{status:'Em análise',observacao:'Atualização sintética',criado_em:'2026-11-07'}],
   anexos:[{nome_arquivo:'arquivo-ficticio.jpg'}]
  })};
 }});
 const dados=await cliente.consultar({protocolo:'PROTO-TESTE',chave:'c'.repeat(64)});
 assert.equal(dados.resultado[0].status,'Em análise');
 assert.equal(dados.respostas[0].texto,'Resposta sintética');
 assert.equal(dados.historico[0].observacao,'Atualização sintética');
 assert.equal(dados.anexos[0].nome_arquivo,'arquivo-ficticio.jpg');
 assert.equal(pedidos,1);
});
