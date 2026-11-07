import {test} from 'node:test';
import assert from 'node:assert/strict';
import {iniciarHomologacao} from './iniciar-homologacao.mjs';

test('não inicializa sem ambiente explicitamente homologado',async()=>{
 await assert.rejects(iniciarHomologacao({env:{},carregarPg:async()=>{throw Error('não deveria carregar')}}),/homologação obrigatório/);
});
test('não inicializa sem habilitação explícita',async()=>{
 await assert.rejects(iniciarHomologacao({env:{MANDATO_AMBIENTE:'homologacao'},carregarPg:async()=>{throw Error('não deveria carregar')}}),/desabilitada/);
});
test('não aceita flag como substituto da autenticação administrativa',async()=>{
 await assert.rejects(iniciarHomologacao({env:{MANDATO_AMBIENTE:'homologacao',HABILITAR_API_NEON:'sim',AUTENTICACAO_ADMIN_CONFIGURADA:'sim'},carregarPg:async()=>{throw Error('não deveria carregar')}}),/não substitui/);
});
test('exige segredo de conexão no servidor',async()=>{
 await assert.rejects(iniciarHomologacao({env:{MANDATO_AMBIENTE:'homologacao',HABILITAR_API_NEON:'sim'},carregarPg:async()=>{throw Error('não deveria carregar')}}),/DATABASE_URL/);
});
