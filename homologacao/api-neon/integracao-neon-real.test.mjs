// Teste de integração REAL, opt-in, sem dados de cidadãos.
// Execução: MANDATO_TESTE_NEON_REAL=sim DATABASE_URL='postgresql://...' node --test integracao-neon-real.test.mjs
// DATABASE_URL deve apontar para o Neon ISOLADO e usar mandato_api_homologacao.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emitirChavePrivada} from './chaves-privadas.mjs';
import {criarOperacaoConsultaNeonRestrita} from './operacao-consulta-neon-restrita.mjs';
const ativo=process.env.MANDATO_TESTE_NEON_REAL==='sim';
test('Neon real: RPC, chave correta, incorreta, revogada e bloqueio de tabela', {skip:!ativo},async()=>{
 const url=process.env.DATABASE_URL;
 if(!url)throw Error('DATABASE_URL obrigatória');
 const destino=new URL(url);
 const host=destino.hostname.toLowerCase();
 if(!host.endsWith('.neon.tech')||host!==process.env.NEON_HOST_HOMOLOGACAO)
  throw Error('Host de homologação não autorizado');
 if(decodeURIComponent(destino.username)!=='mandato_api_homologacao')
  throw Error('Papel restrito obrigatório');
 if(['sslmode','sslcert','sslkey','sslrootcert'].some(k=>destino.searchParams.has(k)))
  throw Error('Parâmetros SSL não autorizados');
 const {default:pg}=await import('pg');
 const pool=new pg.Pool({connectionString:url,ssl:{rejectUnauthorized:true},max:1,connectionTimeoutMillis:5000});
 try {
  const identidade=await pool.query('SELECT current_user AS usuario,current_database() AS banco');
  assert.equal(identidade.rows[0].usuario,'mandato_api_homologacao');
  assert.equal(identidade.rows[0].banco,'neondb');
  const permissoes=await pool.query(`SELECT
   has_function_privilege(current_user,'mandato_chaves_homologacao.consultar_chave(text,bytea)','EXECUTE') AS pode_consultar,
   has_table_privilege(current_user,'mandato_chaves_homologacao.chaves_acompanhamento','SELECT') AS pode_ler_hash,
   has_table_privilege(current_user,'mandato_chaves_homologacao.chaves_acompanhamento','INSERT') AS pode_inserir_hash`);
  assert.equal(permissoes.rows[0].pode_consultar,true);
  assert.equal(permissoes.rows[0].pode_ler_hash,false);
  assert.equal(permissoes.rows[0].pode_inserir_hash,false);
  const consulta=criarOperacaoConsultaNeonRestrita({pool});
  // Registros fictícios 900009 (revogado) e 900010 (ativo) criados previamente.
  // A chave real do 900010 não é recuperável: apenas seu hash é armazenado.
  // Confirmar via RPC usando hash de teste conhecido, sem alterar o banco.
  const hashValido=Buffer.from('ef'.repeat(32),'hex');
  const certo=await pool.query('SELECT assunto,status FROM mandato_chaves_homologacao.consultar_chave($1::text,$2::bytea)',['TESTE-900010',hashValido]);
  assert.equal(certo.rows.length,1);
  assert.equal(certo.rows[0].status,'Recebido');
  const errado=await pool.query('SELECT assunto,status FROM mandato_chaves_homologacao.consultar_chave($1::text,$2::bytea)',['TESTE-900010',Buffer.alloc(32)]);
  assert.equal(errado.rows.length,0);
  const revogado=await pool.query('SELECT assunto,status FROM mandato_chaves_homologacao.consultar_chave($1::text,$2::bytea)',['TESTE-900009',Buffer.from('f692f44d5a3c33635193824542c3ea0b0d1ba2052149d8e70cbec757314b5519','hex')]);
  assert.equal(revogado.rows.length,0);
  await assert.rejects(pool.query('SELECT chave_hash FROM mandato_chaves_homologacao.chaves_acompanhamento LIMIT 1'),e=>e.code==='42501');
  assert.equal(typeof consulta,'function');
 }finally{await pool.end();}
});
