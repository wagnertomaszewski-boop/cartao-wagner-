'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const raiz = path.resolve(__dirname, '../..');
const painel = fs.readFileSync(path.join(raiz, 'painel/index.html'), 'utf8');
const sql = fs.readFileSync(path.join(raiz, 'homologacao/fiscalizacao/estrutura-isolada.sql'), 'utf8');
const api = fs.readFileSync(path.join(raiz, 'homologacao/api-neon/iniciar-homologacao.mjs'), 'utf8');

test('homologação não expõe conexão Neon nem substitui autenticação Supabase do painel', () => {
 assert.match(painel, /const SUPABASE_URL\s*=\s*["']https:\/\//);
 assert.match(painel, /await obterSessaoValida\(\)/);
 assert.doesNotMatch(painel, /DATABASE_URL|postgres(?:ql)?:\/\/|\.neon\.tech/i);
 assert.match(api, /NEON_HOST_HOMOLOGACAO/);
 assert.match(api, /mandato_api_homologacao/);
 assert.match(api, /criarVerificadorAdmin/);
});

test('schema de fiscalização permanece isolado e sem acesso público', () => {
 assert.match(sql, /CREATE SCHEMA IF NOT EXISTS fiscalizacao_homologacao/);
 assert.match(sql, /REVOKE ALL ON SCHEMA fiscalizacao_homologacao FROM PUBLIC/);
 assert.match(sql, /REVOKE ALL ON ALL TABLES IN SCHEMA fiscalizacao_homologacao FROM PUBLIC/);
 assert.match(sql, /REVOKE ALL ON ALL SEQUENCES IN SCHEMA fiscalizacao_homologacao FROM PUBLIC/);
 assert.match(sql, /REFERENCES fiscalizacao_homologacao\.solicitacoes\(id\)/);
 assert.match(sql, /ON DELETE RESTRICT/);
});

test('painel exige sessão antes de gravar e consultar fiscalização', () => {
 for (const nome of ['salvarEncaminhamentoPrefeitura','registrarHistoricoFiscalizacaoMandato','consultarHistoricoFiscalizacaoMandato']) {
  const inicio = painel.indexOf('async function ' + nome + '(');
  assert.ok(inicio >= 0, nome + ' não encontrada');
  const fim = painel.indexOf('\nasync function ', inicio + 15);
  const corpo = painel.slice(inicio, fim < 0 ? undefined : fim);
  assert.match(corpo, /await obterSessaoValida\(\)/, nome + ': sessão ausente');
  assert.match(corpo, /Authorization.*Bearer/, nome + ': token ausente');
 }
});
