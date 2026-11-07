// Execute localmente com: node --test prototipos/recuperacao-api.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
// Importa o arquivo .js como módulo sem alterar o package.json do aplicativo.
const source=await readFile(new URL('./recuperacao-api.js',import.meta.url),'utf8');
const {RecuperacaoApi}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('simulação não faz requisições de rede',async()=>{
  const api=new RecuperacaoApi();
  assert.deepEqual(await api.solicitar('TESTE-000001','51999990001'),{simulacao:true,mensagem:'Nenhum pedido enviado'});
});
test('não permite ambiente produção',()=>{
  assert.throws(()=>new RecuperacaoApi({ambiente:'producao',baseUrl:'https://example.com',publishableKey:'fake'}),/não autorizado/);
});
test('não aprova sem confirmação da identidade',async()=>{
  const api=new RecuperacaoApi();
  await assert.rejects(api.decidir(1,true,false,'token-ficticio'),/Confirme a identidade/);
});
test('não autoriza operação administrativa sem token',async()=>{
  const api=new RecuperacaoApi();
  await assert.rejects(api.listar(''),/não autenticado/);
  await assert.rejects(api.decidir(1,false,false,''),/não autenticado/);
});
test('valida dados antes de enviar',async()=>{
  const api=new RecuperacaoApi();
  await assert.rejects(api.solicitar('x','51999990001'),/Protocolo inválido/);
  await assert.rejects(api.solicitar('TESTE-000001','123'),/WhatsApp inválido/);
});

test('bloqueia os dois projetos Supabase reais mesmo em homologação',()=>{
  for(const id of ['pmmsdjozyyxkbuqlkfpb','kmttgzraotabxvqmrren']) {
    assert.throws(()=>new RecuperacaoApi({ambiente:'homologacao',baseUrl:'https://'+id+'.supabase.co',publishableKey:'fake'}),/produção não permitido/);
  }
});
test('rejeita URL malformada ou domínio externo',()=>{
  for(const url of ['http://teste.supabase.co','https://teste.supabase.co.evil.com','https://teste.supabase.co/qualquer','https://teste.supabase.co?x=1']) {
    assert.throws(()=>new RecuperacaoApi({ambiente:'homologacao',baseUrl:url,publishableKey:'fake'}));
  }
});

test('exige identificação explícita do projeto de homologação',()=>{
  assert.throws(()=>new RecuperacaoApi({ambiente:'homologacao',baseUrl:'https://abcdefghijklmnopqrst.supabase.co',publishableKey:'fake'}),/não autorizado/);
  assert.throws(()=>new RecuperacaoApi({ambiente:'homologacao',baseUrl:'https://abcdefghijklmnopqrst.supabase.co',projetoHomologacao:'zyxwvutsrqponmlkjihg',publishableKey:'fake'}),/não autorizado/);
  assert.doesNotThrow(()=>new RecuperacaoApi({ambiente:'homologacao',baseUrl:'https://abcdefghijklmnopqrst.supabase.co',projetoHomologacao:'abcdefghijklmnopqrst',publishableKey:'fake'}));
});
