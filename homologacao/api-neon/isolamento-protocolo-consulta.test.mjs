import test from 'node:test';
import assert from 'node:assert/strict';
import {criarOperacoesNeon} from './operacoes-neon.mjs';

const protocolo='TESTE-ISOLADO-001';
const chaveCorreta='chave-sintetica-aaaaaaaaaaaaaaaaaaaaaaaa';
const chaveErrada='chave-sintetica-bbbbbbbbbbbbbbbbbbbbbbbb';

function simularBanco(){
 const chamadas=[];
 const executarCidadao=async(sql,parametros)=>{
  chamadas.push({sql,parametros});
  const [p,chave]=parametros;
  if(p!==protocolo||chave!==chaveCorreta)return [];
  if(sql.includes('consulta_segura('))return [{assunto:'Iluminação fictícia',status:'Em análise',nome:'NÃO EXPOR',whatsapp:'NÃO EXPOR'}];
  if(sql.includes('consulta_respostas_segura('))return [{texto:'Resposta fictícia',criado_em:'2026-11-07',contato:'NÃO EXPOR'}];
  if(sql.includes('consulta_historico_segura('))return [{status:'Em análise',observacao:'Registro fictício',criado_em:'2026-11-07',anotacao_interna:'NÃO EXPOR'}];
  if(sql.includes('consulta_nomes_anexos_segura('))return [{nome_arquivo:'imagem-ficticia.jpg',url_privada:'NÃO EXPOR'}];
  throw Error('Consulta não permitida');
 };
 return {chamadas,operacoes:criarOperacoesNeon({executarCidadao,executarAdmin:async()=>{throw Error('Admin não esperado')}})};
}

test('chave válida libera somente projeções autorizadas de um protocolo fictício',async()=>{
 const {chamadas,operacoes}=simularBanco();
 const resultado=await operacoes.consultar({dados:{protocolo,chave:chaveCorreta}});
 assert.deepEqual(resultado,{
  resultado:[{assunto:'Iluminação fictícia',status:'Em análise'}],
  respostas:[{texto:'Resposta fictícia',criado_em:'2026-11-07'}],
  historico:[{status:'Em análise',observacao:'Registro fictício',criado_em:'2026-11-07'}],
  anexos:[{nome_arquivo:'imagem-ficticia.jpg'}]
 });
 assert.equal(chamadas.length,4);
 assert.ok(chamadas.every(c=>c.parametros[0]===protocolo&&c.parametros[1]===chaveCorreta));
 assert.ok(!JSON.stringify(resultado).includes('NÃO EXPOR'));
});

test('chave incorreta não consulta histórico, respostas ou anexos',async()=>{
 const {chamadas,operacoes}=simularBanco();
 const resultado=await operacoes.consultar({dados:{protocolo,chave:chaveErrada}});
 assert.deepEqual(resultado,{resultado:[],respostas:[],historico:[],anexos:[]});
 assert.equal(chamadas.length,1);
 assert.match(chamadas[0].sql,/consulta_segura/);
});

test('protocolo inexistente não permite acesso com chave válida de outro registro',async()=>{
 const {chamadas,operacoes}=simularBanco();
 const resultado=await operacoes.consultar({dados:{protocolo:'OUTRO-ISOLADO-002',chave:chaveCorreta}});
 assert.deepEqual(resultado,{resultado:[],respostas:[],historico:[],anexos:[]});
 assert.equal(chamadas.length,1);
});

test('sem chave ou chave curta não acessa o banco',async()=>{
 const {chamadas,operacoes}=simularBanco();
 for(const chave of ['', 'curta']){
  await assert.rejects(()=>operacoes.consultar({dados:{protocolo,chave}}),/Dados inválidos/);
 }
 assert.equal(chamadas.length,0);
});
