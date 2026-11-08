// Smoke de emissão REAL apenas no Neon isolado; usa registro fictício 900004.
// Nunca imprimir chave, URL de conexão, dados de identificação ou hash.
import assert from 'node:assert/strict';
import pg from 'pg';
import {criarEmissorLegadoPostgres} from './emissor-legado-postgres.mjs';
import {criarOperacoesNeon} from './operacoes-neon.mjs';
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
const protocolo='LEGADO-EMISSAO-TESTE-900004';
try{
 const executarCidadao=async(sql,args)=>(await pool.query(sql,args)).rows;
 const operacoes=criarOperacoesNeon({executarCidadao,executarAdmin:executarCidadao});
 const emissor=criarEmissorLegadoPostgres({
  pool,
  // Exclusivamente o ID sintético previamente cadastrado, fixo no código CI.
  verificarIdentidade:async({protocolo:p,comprovante})=>
   p===protocolo && comprovante==='TESTE_INTERNO_FIXTURE_900004' ? {solicitacaoId:900004}:false,
  auditarTentativa:async()=>{}
 });
 const existente=await pool.query('SELECT 1 FROM mandato_testes.chaves_legadas WHERE protocolo=$1',[protocolo]);
 if(existente.rows.length){
  console.log('SKIP: fixture já emitida; execução repetida não deve substituir a chave');
 }else{
  const emitido=await emissor.emitir({protocolo,comprovante:'TESTE_INTERNO_FIXTURE_900004'});
  const resposta=await operacoes.consultar({dados:{protocolo,chave:emitido.chave}});
  assert.deepEqual(resposta.resultado,[{assunto:'Teste emissao legada automatica',status:'recebido'}]);
  const auditoria=await pool.query('SELECT count(*)::integer AS total FROM mandato_testes.auditoria_chaves_legadas WHERE protocolo=$1 AND solicitacao_id=$2 AND evento=$3',[protocolo,900004,'chave_legada_emitida']);
  assert.equal(auditoria.rows[0].total,1);
  const negado=await operacoes.consultar({dados:{protocolo,chave:'0'.repeat(64)}});
  assert.deepEqual(negado.resultado,[]);
  console.log('PASS: emissão real, hash, auditoria atômica e consulta segura no Neon isolado');
 }
}finally{await pool.end();}
