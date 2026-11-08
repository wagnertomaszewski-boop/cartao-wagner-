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
 console.log('PASS: acesso direto bloqueado por privilégio mínimo; emissão real aguarda RPC autorizada');
}finally{
 await pool.end();
}
