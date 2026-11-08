// Auditoria somente leitura da emissão sintética 900006 já concluída.
// Não reemite chave, não consulta segredo e não acessa dados reais.
import assert from 'node:assert/strict';
import pg from 'pg';
const env=process.env;
if(env.MANDATO_AMBIENTE!=='homologacao'||env.HABILITAR_API_NEON!=='sim'||!env.DATABASE_URL)
 throw Error('Homologação obrigatória');
const url=new URL(env.DATABASE_URL);
if(!url.hostname.endsWith('.neon.tech')||url.hostname!==env.NEON_HOST_HOMOLOGACAO||
 decodeURIComponent(url.username)!=='mandato_api_homologacao'||
 ['sslmode','sslcert','sslkey','sslrootcert'].some(k=>url.searchParams.has(k)))
 throw Error('Destino não autorizado');
const pool=new pg.Pool({connectionString:env.DATABASE_URL,ssl:{rejectUnauthorized:true},max:1});
try{
 const permissoes=await pool.query(`SELECT
  has_function_privilege(current_user,'mandato_testes.emitir_chave_legada_teste_900006(text,bigint,text)','EXECUTE') AS api_emite,
  has_function_privilege('mandato_cidadao_a','mandato_testes.emitir_chave_legada_teste_900006(text,bigint,text)','EXECUTE') AS cidadao_emite,
  has_function_privilege(current_user,'mandato_testes.aprovacao_emissao_teste_900006(bigint)','EXECUTE') AS api_aprova,
  has_function_privilege('mandato_cidadao_a','mandato_testes.aprovacao_emissao_teste_900006(bigint)','EXECUTE') AS cidadao_aprova,
  has_table_privilege(current_user,'mandato_testes.chaves_legadas','INSERT') AS insere_chaves,
  has_table_privilege(current_user,'mandato_testes.acessos_protocolo','INSERT') AS insere_acessos,
  has_table_privilege(current_user,'mandato_testes.auditoria_chaves_legadas','INSERT') AS insere_auditoria`);
 assert.deepEqual(permissoes.rows[0],{
  api_emite:true,cidadao_emite:false,api_aprova:true,cidadao_aprova:false,
  insere_chaves:false,insere_acessos:false,insere_auditoria:false
 });
 const resultado=await pool.query('SELECT mandato_testes.aprovacao_emissao_teste_900006($1) AS aprovada',[900006]);
 assert.equal(typeof resultado.rows[0]?.aprovada,'boolean');
 const outro=await pool.query('SELECT mandato_testes.aprovacao_emissao_teste_900006($1) AS aprovada',[900007]);
 assert.equal(outro.rows[0]?.aprovada,false,'Outro ID não deve aproveitar aprovação');
 console.log('PASS: funções 900006 restritas, sem INSERT direto e sem vazamento entre IDs');
}finally{await pool.end();}
