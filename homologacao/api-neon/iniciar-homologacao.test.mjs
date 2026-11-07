import {test} from 'node:test';
import assert from 'node:assert/strict';
import {iniciarHomologacao} from './iniciar-homologacao.mjs';

test('não inicializa sem ambiente explicitamente homologado',async()=>{
 await assert.rejects(iniciarHomologacao({env:{},carregarPg:async()=>{throw Error('não deveria carregar')}}),/homologação obrigatório/);
});
test('não inicializa sem habilitação explícita',async()=>{
 await assert.rejects(iniciarHomologacao({env:{MANDATO_AMBIENTE:'homologacao'},carregarPg:async()=>{throw Error('não deveria carregar')}}),/desabilitada/);
});
test('exige segredo de conexão no servidor',async()=>{
 await assert.rejects(iniciarHomologacao({env:{MANDATO_AMBIENTE:'homologacao',HABILITAR_API_NEON:'sim'},carregarPg:async()=>{throw Error('não deveria carregar')}}),/DATABASE_URL/);
});

test('rejeita endereço de banco Supabase em homologação antes de abrir conexão',async()=>{
 await assert.rejects(iniciarHomologacao({env:{MANDATO_AMBIENTE:'homologacao',HABILITAR_API_NEON:'sim',DATABASE_URL:'postgresql://usuario:senha@db.pmmsdjozyyxkbuqlkfpb.supabase.co:5432/postgres'},carregarPg:async()=>{throw Error('NÃO deve abrir conexão');}}),/Banco de produção proibido/);
});
