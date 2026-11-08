// Smoke de privilégios no Neon isolado: não emite chaves nem acessa dados reais.
import assert from 'node:assert/strict';
import pg from 'pg';
const env=process.env;
if(env.MANDATO_AMBIENTE!=='homologacao'||env.HABILITAR_API_NEON!=='sim'||!env.DATABASE_URL)
 throw Error('Ambiente de homologação obrigatório');
const url=new URL(env.DATABASE_URL);
if(!url.hostname.endsWith('.neon.tech')||url.hostname!==env.NEON_HOST_HOMOLOGACAO||
 decodeURIComponent(url.username)!=='mandato_api_homologacao')
 throw Error('Destino de homologação não autorizado');
if(['sslmode','sslcert','sslkey','sslrootcert'].some(k=>url.searchParams.has(k)))
 throw Error('SSL sobrescrito pela URL');
const pool=new pg.Pool({connectionString:env.DATABASE_URL,ssl:{rejectUnauthorized:true},max:2,connectionTimeoutMillis:3000});
try {
 let negado=false;
 try {
  await pool.query('SELECT 1 FROM mandato_testes.chaves_legadas WHERE protocolo=$1',['LEGADO-EMISSAO-TESTE-900004']);
 }catch(erro){
  if(erro.code==='42501')negado=true;
  else throw erro;
 }
 assert.equal(negado,true,'Conta de API não deve ler tabela interna de chaves');
 const privilegios=await pool.query(`
  SELECT
   has_table_privilege(current_user,'mandato_testes.chaves_legadas','INSERT') AS insere_chaves,
   has_table_privilege(current_user,'mandato_testes.acessos_protocolo','INSERT') AS insere_acessos,
   has_table_privilege(current_user,'mandato_testes.auditoria_chaves_legadas','INSERT') AS insere_auditoria,
   has_table_privilege(current_user,'mandato_testes.solicitacoes','SELECT') AS le_solicitacoes
 `);
 assert.deepEqual(privilegios.rows[0],{
  insere_chaves:false,insere_acessos:false,insere_auditoria:false,le_solicitacoes:false
 },'Conta da API deve manter privilégios mínimos nas quatro tabelas');
 // A RPC de emissão fictícia deve permanecer restrita ao papel de serviço,
 // sem abrir INSERT nas tabelas ou EXECUTE para usuários públicos.
 const funcoes=await pool.query(`
  SELECT has_function_privilege(current_user,
   'mandato_testes.emitir_chave_legada_teste_900005(text,bigint,text)','EXECUTE') AS api_executa,
   has_function_privilege('mandato_cidadao_a',
   'mandato_testes.emitir_chave_legada_teste_900005(text,bigint,text)','EXECUTE') AS publico_executa
 `);
 assert.equal(funcoes.rows[0].api_executa,true,'Somente RPC fictícia deve ser acessível à API');
 assert.equal(funcoes.rows[0].publico_executa,false,'Emissão não pode ser pública');
 const contrato=await pool.query(`
  SELECT p.proname,pg_get_function_result(p.oid) AS retorno,
   has_function_privilege(current_user,p.oid,'EXECUTE') AS api_executa,
   has_function_privilege('mandato_cidadao_a',p.oid,'EXECUTE') AS cidadao_executa,
   position('decidido_em >= now() - interval ''24 hours''' in pg_get_functiondef(p.oid))>0 AS limite_inferior,
   position('decidido_em <= now()' in pg_get_functiondef(p.oid))>0 AS limite_superior
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='mandato_testes'
   AND p.proname IN ('emitir_chave_legada_teste_900004','emitir_chave_legada_teste_900005')
  ORDER BY p.proname
 `);
 assert.deepEqual(contrato.rows.map(x=>x.proname),[
  'emitir_chave_legada_teste_900004','emitir_chave_legada_teste_900005'
 ],'As duas RPCs fictícias devem existir');
 for(const funcao of contrato.rows){
  assert.equal(funcao.retorno,'boolean','RPC deve confirmar gravação com boolean');
  assert.equal(funcao.api_executa,true,'API deve executar RPC');
  assert.equal(funcao.cidadao_executa,false,'Cidadão não deve executar RPC');
  assert.equal(funcao.limite_inferior,true,'Aprovação antiga não pode ser aceita');
  assert.equal(funcao.limite_superior,true,'Aprovação futura não pode ser aceita');
 }
 console.log('PASS: contrato real das duas RPCs, retorno booleano, permissões e janela de 24h');
 console.log('PASS: quatro tabelas protegidas contra acesso direto; emissão real aguarda RPC autorizada');
}finally{
 await pool.end();
}
