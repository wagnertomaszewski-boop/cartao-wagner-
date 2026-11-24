import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
const sql=await readFile(new URL('../sql/CONTENCAO-URGENTE-PROTOCOLO-NAO-EXECUTAR.sql',import.meta.url),'utf8');

async function criarEnsaio(){
 const db=new PGlite();
 const ddl=[
 'CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;CREATE SCHEMA storage;',
 "CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $x$ SELECT '00000000-0000-4000-8000-000000000001'::uuid $x$;",
 'CREATE TABLE public.solicitacoes(id bigint PRIMARY KEY);',
 'CREATE TABLE public.respostas_solicitacoes(id bigint PRIMARY KEY);',
 'CREATE TABLE storage.buckets(id text PRIMARY KEY, public boolean NOT NULL);',
 "INSERT INTO storage.buckets(id,public) VALUES ('documentos-respostas',true),('conteudos-mandato',true);",
 'CREATE TABLE storage.objects(bucket_id text NOT NULL);',
 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;',
 "CREATE POLICY \"admin atualiza documentos de resposta\" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='documentos-respostas' AND auth.uid()='00000000-0000-4000-8000-000000000001'::uuid);",
 "CREATE POLICY publico_le_conteudos_mandato ON storage.objects FOR SELECT TO PUBLIC USING (bucket_id='conteudos-mandato');",
 "CREATE FUNCTION public.consulta_publica_protocolo(p_protocolo text) RETURNS text LANGUAGE sql SECURITY DEFINER AS $x$ SELECT 'teste'::text $x$;",
 "CREATE FUNCTION public.consulta_publica_historico_protocolo(p_protocolo text) RETURNS text LANGUAGE sql SECURITY DEFINER AS $x$ SELECT 'teste'::text $x$;",
 "CREATE FUNCTION public.consulta_publica_respostas_protocolo(p_protocolo text) RETURNS text LANGUAGE sql SECURITY DEFINER AS $x$ SELECT 'teste'::text $x$;",
 "CREATE FUNCTION public.consultar_protocolo(p_protocolo text) RETURNS text LANGUAGE sql SECURITY DEFINER AS $x$ SELECT 'teste'::text $x$;"
 ].join('\n');
 await db.exec(ddl);
 return db;
}

test('contenção bloqueia quatro RPCs e restringe documentos no PostgreSQL isolado',async()=>{
 const db=await criarEnsaio();
 try{
  const cond="FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('consulta_publica_protocolo','consulta_publica_historico_protocolo','consulta_publica_respostas_protocolo','consultar_protocolo')";
  const abertos=await db.query("SELECT count(*)::int AS c "+cond+" AND has_function_privilege('anon',p.oid,'EXECUTE')");
  assert.equal(abertos.rows[0].c,4);
  const ensaio=sql.replace('BEGIN;', "BEGIN;\nSELECT set_config('mandato.contencao_urgente_autorizada','sim',true);\nSELECT set_config('mandato.backup_confirmado','sim',true);");
  await db.exec(ensaio);
  const fechados=await db.query("SELECT count(*)::int AS c "+cond+" AND (has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('authenticated',p.oid,'EXECUTE'))");
  assert.equal(fechados.rows[0].c,0);
  const buckets=(await db.query('SELECT id,public FROM storage.buckets')).rows;
  assert.equal(buckets.find(x=>x.id==='documentos-respostas').public,false);
  assert.equal(buckets.find(x=>x.id==='conteudos-mandato').public,true);
  const policies=(await db.query("SELECT policyname,cmd FROM pg_policies WHERE schemaname='storage' AND tablename='objects'")).rows;
  assert.ok(policies.some(x=>x.policyname==='documentos_resposta_leitura_admin'&&x.cmd==='SELECT'));
  assert.ok(policies.some(x=>x.policyname==='documentos_resposta_leitura_restrita'&&x.cmd==='SELECT'));
  assert.ok(policies.some(x=>x.policyname==='admin atualiza documentos de resposta'&&x.cmd==='UPDATE'));
 }finally{await db.close();}
});

test('contenção recusa ausência de autorização sem alterar dados nem permissões',async()=>{
 const db=await criarEnsaio();
 try{
  await assert.rejects(db.exec(sql),/Contenção não autorizada/);
  await db.exec('ROLLBACK;');
  assert.equal((await db.query("SELECT public FROM storage.buckets WHERE id='documentos-respostas'")).rows[0].public,true);
  assert.equal((await db.query("SELECT has_function_privilege('anon','public.consulta_publica_protocolo(text)','EXECUTE') AS permitido")).rows[0].permitido,true);
 }finally{await db.close();}
});
