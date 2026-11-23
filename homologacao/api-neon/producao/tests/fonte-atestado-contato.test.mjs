import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {criarFonteAtestadoContato} from '../fonte-atestado-contato.mjs';

const pedidoId='00000000-0000-4000-8000-000000000011';
test('a fonte de comprovantes lê somente o pedido vinculado sem executar escritas',async()=>{
 const consultas=[];
 const fonte=criarFonteAtestadoContato({pool:{query:async(sql,args)=>{
  consultas.push({sql,args});return {rows:[{payload:'sintetico',assinatura:'sintetica'}]};
 }}});
 assert.deepEqual(await fonte({pedidoId,solicitacaoId:'123'}),{payload:'sintetico',assinatura:'sintetica'});
 assert.equal(consultas.length,1);
 assert.match(consultas[0].sql,/^SELECT payload,assinatura FROM mandato_privado\.atestados_regularizacao/);
 assert.match(consultas[0].sql,/revogado_em IS NULL/);
 assert.equal(/INSERT|UPDATE|DELETE|DROP/i.test(consultas[0].sql),false);
 assert.deepEqual(consultas[0].args,[pedidoId,'123']);
 assert.equal(await fonte({pedidoId:'invalido',solicitacaoId:'123'}),null);
 assert.equal(await fonte({pedidoId,solicitacaoId:'-1'}),null);
 assert.equal(consultas.length,1);
 assert.throws(()=>criarFonteAtestadoContato({}),/Conexão privada/);
});

test('consulta de atestado reutiliza a transação existente no pool com max=1',async()=>{
 let abriuSegundaConexao=0,consultasTransacionais=0;
 const fonte=criarFonteAtestadoContato({pool:{query:async()=>{
  abriuSegundaConexao++;throw Error('A segunda conexão ficaria bloqueada');
 }}});
 const executorConsulta={query:async(sql,args)=>{
  consultasTransacionais++;
  assert.match(sql,/^SELECT payload,assinatura/);
  assert.deepEqual(args,[pedidoId,'123']);
  return {rows:[{payload:'assinatura-sintetica',assinatura:'teste'}]};
 }};
 assert.deepEqual(await fonte({pedidoId,solicitacaoId:'123'},executorConsulta),
  {payload:'assinatura-sintetica',assinatura:'teste'});
 assert.equal(abriuSegundaConexao,0);
 assert.equal(consultasTransacionais,1);
 assert.equal(await fonte({pedidoId,solicitacaoId:'123'},{}),null);
 assert.equal(abriuSegundaConexao,0);
});

test('a interface candidata oferece regularização isolada sem token de prova enviado pelo navegador',async()=>{
 const caminho=fileURLToPath(new URL('../web/painel.mjs',import.meta.url));
 execFileSync(process.execPath,['--check',caminho]);
 const painel=await readFile(caminho,'utf8');
 assert.match(painel,/regularizar-contato/);
 assert.match(painel,/Regularizar celular antigo \(prova independente\)/);
 assert.match(painel,/contato_regularizado/);
 assert.match(painel,/regularizacao_configurada===true/);
 assert.match(painel,/r\.estado==='aprovado'&&\(!numeroHistoricoSemNonoDigito\(r\.whatsapp\)\|\|r\.contato_regularizado===true\)/);
 assert.match(painel,/a regularização ainda depende de um verificador independente habilitado/);
 assert.equal(painel.includes('chavePrivadaConferente'),false);
 assert.equal(painel.includes('assinatura:'),false);
 const edge=await readFile(new URL('../supabase/functions/mandato-privado/index.ts',import.meta.url),'utf8');
 assert.match(edge,/validarRegularizacaoContato/);
 assert.match(edge,/MANDATO_CONFERENTE_ED25519_PUBLIC_KEY/);
 assert.match(edge,/const validarRegularizacaoContato=chaveConferente\?/);
});
