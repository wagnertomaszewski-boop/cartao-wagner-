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
   has_function_privilege('PUBLIC',
   'mandato_testes.emitir_chave_legada_teste_900005(text,bigint,text)','EXECUTE') AS publico_executa
 `);
 assert.equal(funcoes.rows[0].api_executa,true,'Somente RPC fictícia deve ser acessível à API');
 assert.equal(funcoes.rows[0].publico_executa,false,'Emissão não pode ser pública');
 console.log('PASS: quatro tabelas protegidas contra acesso direto; emissão real aguarda RPC autorizada');
}finally{
 await pool.end();
}
