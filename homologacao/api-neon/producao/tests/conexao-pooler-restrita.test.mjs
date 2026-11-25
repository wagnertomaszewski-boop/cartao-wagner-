import test from 'node:test';
import assert from 'node:assert/strict';
import {validarConfiguracaoServidor} from '../configuracao.mjs';

const ref='pmmsdjozyyxkbuqlkfpb';
const env={
 MANDATO_AMBIENTE:'producao',
 SUPABASE_URL:'https://'+ref+'.supabase.co',
 MANDATO_API_ORIGIN:'https://'+ref+'.supabase.co/functions/v1/mandato-privado',
 MANDATO_RELEASE_SHA:'a'.repeat(40),
 MANDATO_PUBLICACAO_AUTORIZADA:'sim',
 MANDATO_SEGREDO:'segredo-produto-inteiramente-sintetico-32bytes',
 AUTH_HML_SECRET:'nao-e-o-mesmo-segredo'
};
const validar=DATABASE_URL=>validarConfiguracaoServidor({...env,DATABASE_URL});

test('aceita somente conexões restritas do Supabase: direto e pooler sessão/transação',()=>{
 const aceitas=[
  'postgresql://mandato_api_privada:senha-ficticia@db.'+ref+'.supabase.co:5432/postgres',
  'postgres://mandato_api_privada.'+ref+':senha-ficticia@aws-0-sa-east-1.pooler.supabase.com:5432/postgres',
  'postgres://mandato_api_privada.'+ref+':senha-ficticia@aws-0-sa-east-1.pooler.supabase.com:6543/postgres'
 ];
 for(const url of aceitas)
  assert.equal(validar(url).projeto,ref);
});

test('nega papel administrativo, projeto diferente, host falso, porta errada e banco paralelo',()=>{
 const rejeitadas=[
  'postgresql://postgres:senha@db.'+ref+'.supabase.co:5432/postgres',
  'postgresql://mandato_api_privada:senha@db.outro-projeto.supabase.co:5432/postgres',
  'postgres://postgres.'+ref+':senha@aws-0-sa-east-1.pooler.supabase.com:5432/postgres',
  'postgres://mandato_api_privada.outro:senha@aws-0-sa-east-1.pooler.supabase.com:5432/postgres',
  'postgres://mandato_api_privada.'+ref+':senha@aws-0-sa-east-1.pooler.supabase.com.invalid:5432/postgres',
  'postgres://mandato_api_privada.'+ref+':senha@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
  'postgres://mandato_api_privada.'+ref+':senha@aws-0-sa-east-1.pooler.supabase.com:5431/postgres',
  'postgres://mandato_api_privada.'+ref+':senha@aws-0-sa-east-1.pooler.supabase.com:6543/outro',
  'postgresql://mandato_api_privada:senha@localhost:5432/postgres',
  'http://mandato_api_privada:senha@db.'+ref+'.supabase.co:5432/postgres',
  'postgresql://mandato_api_privada@db.'+ref+'.supabase.co:5432/postgres'
 ];
 for(const url of rejeitadas)
  assert.throws(()=>validar(url),/Conexão produtiva restrita obrigatória/,url);
});

test('sem autorização explícita ou com segredo de homologação, recusa antes da conexão',()=>{
 const url='postgres://mandato_api_privada.'+ref+':senha@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';
 assert.throws(()=>validarConfiguracaoServidor({...env,MANDATO_PUBLICACAO_AUTORIZADA:'nao',DATABASE_URL:url}),/Publicação não autorizada/);
 assert.throws(()=>validarConfiguracaoServidor({...env,AUTH_HML_SECRET:env.MANDATO_SEGREDO,DATABASE_URL:url}),/Segredo produtivo independente obrigatório/);
});

test('aceita somente parâmetros de TLS que não enfraquecem a verificação',()=>{
 const url='postgresql://mandato_api_privada.'+ref+':senha-ficticia@aws-0-sa-east-1.pooler.supabase.com:5432/postgres';
 assert.equal(validar(url+'?sslmode=verify-full').projeto,ref);
 for(const query of ['sslmode=disable','sslmode=require','sslmode=verify-full&sslmode=disable','ssl=no-verify','host=outro.example'])
  assert.throws(()=>validar(url+'?'+query),/TLS com verificação completa/);
});

test('identifica o projeto pelo SUPABASE_URL e rejeita endereços incompatíveis',()=>{
 const DATABASE_URL='postgresql://mandato_api_privada:senha-ficticia@db.'+ref+'.supabase.co/postgres';
 assert.equal(validarConfiguracaoServidor({...env,DATABASE_URL,SUPABASE_URL:env.SUPABASE_URL+'/'}).projeto,ref);
 for(const SUPABASE_URL of [undefined,'https://'+ 'a'.repeat(20)+'.supabase.co',
  'http://'+ref+'.supabase.co',env.SUPABASE_URL+'/storage/v1',env.SUPABASE_URL+'.invalid',
  'https://usuario@'+ref+'.supabase.co',env.SUPABASE_URL+'?ambiente=outro']){
  assert.throws(()=>validarConfiguracaoServidor({...env,DATABASE_URL,SUPABASE_URL}),/SUPABASE_URL deve apontar/);
 }
});
