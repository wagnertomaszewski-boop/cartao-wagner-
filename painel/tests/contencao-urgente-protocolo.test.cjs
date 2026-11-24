// Teste estático de segurança da candidata em GitHub. Não conecta ao Supabase.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const raiz=join(__dirname,'../..');
const painel=readFileSync(join(raiz,'painel/index.html'),'utf8');
const sql=readFileSync(join(raiz,'homologacao/api-neon/producao/sql/CONTENCAO-URGENTE-PROTOCOLO-NAO-EXECUTAR.sql'),'utf8');

test('respostas do mandato nunca geram URL de documento público no Painel candidato',()=>{
 assert.match(painel,/async function abrirDocumentoResposta\(/);
 assert.match(painel,/\/storage\/v1\/object\/sign\/documentos-respostas\//);
 assert.match(painel,/expiresIn:300/);
 assert.match(painel,/obterSessaoValida\(\)/);
 assert.match(painel,/onclick="abrirDocumentoResposta\(this\.dataset\.caminho, this\)"/);
 assert.doesNotMatch(painel,/caminhoPublicoStorage\("documentos-respostas"/);
 assert.doesNotMatch(painel,/const url = esc\(a\.url \|\| ""\)/);
 assert.doesNotMatch(painel,/\/storage\/v1\/object\/public\/documentos-respostas\//);
 assert.match(painel,/const caminho = String\(a\.caminho \|\| ""\)/);
});

test('contenção candidata contempla exatamente os quatro RPCs legados, sem liberar anon',()=>{
 const nomes=[
  'consulta_publica_protocolo',
  'consulta_publica_historico_protocolo',
  'consulta_publica_respostas_protocolo',
  'consultar_protocolo'
 ];
 for(const nome of nomes){
  assert.match(sql,new RegExp('REVOKE EXECUTE ON FUNCTION public\\.'+nome+'\\(text\\)'));
 }
 assert.equal((sql.match(/REVOKE EXECUTE ON FUNCTION public\./g)||[]).length,4);
 assert.equal((sql.match(/FROM PUBLIC, anon, authenticated;/g)||[]).length,4);
 assert.match(sql,/mandato\.contencao_urgente_autorizada/);
 assert.match(sql,/mandato\.backup_confirmado/);
 assert.match(sql,/UPDATE storage\.buckets SET public=false/);
 assert.match(sql,/CREATE POLICY documentos_resposta_leitura_admin/);
 assert.match(sql,/CREATE POLICY documentos_resposta_leitura_restrita/);
 assert.match(sql,/has_function_privilege\('anon',f,'EXECUTE'\)/);
 assert.match(sql,/has_function_privilege\('authenticated',f,'EXECUTE'\)/);
 assert.doesNotMatch(sql,/GRANT EXECUTE ON FUNCTION public\./);
 assert.doesNotMatch(sql,/UPDATE\s+public\.solicitacoes\b/i);
 assert.doesNotMatch(sql,/DELETE\s+FROM\s+public\.solicitacoes\b/i);
});
