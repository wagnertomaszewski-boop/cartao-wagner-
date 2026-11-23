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
