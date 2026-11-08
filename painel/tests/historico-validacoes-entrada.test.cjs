// Execute: node painel/tests/historico-validacoes-entrada.test.cjs
// Usa a funcao real do painel; bloqueia confirmacao, sessao e rede.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('async function registrarHistoricoFiscalizacaoMandato(');
const end = html.indexOf('async function consultarHistoricoFiscalizacaoMandato(', start);
assert.ok(start >= 0 && end > start, 'Funcao de historico nao encontrada');
const source = html.slice(start, end);
const scenarios = [
  ['id-zero', 0, []],
  ['tipo-invalido', 7, ['outro']],
  ['descricao-curta', 7, ['cobranca', 'abc']],
  ['protocolo-longo', 7, ['cobranca', 'Cobranca oficial de teste', 'x'.repeat(121)]],
  ['cancelar-tipo', 7, [null]],
  ['cancelar-descricao', 7, ['cobranca', null]],
  ['cancelar-protocolo', 7, ['cobranca', 'Cobranca oficial de teste', null]]
];
(async () => {
  for (const [name, id, inputs] of scenarios) {
    const queue = [...inputs], alerts = [], button = {disabled:false};
    let networkCalls = 0;
    const mocks = {
      prompt: () => queue.shift(),
      normalizar: s => s.toLowerCase(),
      alert: s => alerts.push(s),
      confirm: () => {throw Error('Confirmacao indevida: '+name)},
      obterSessaoValida: async () => {throw Error('Sessao indevida: '+name)},
      requisicao: async () => {networkCalls++;throw Error('Rede indevida: '+name)},
      document: {getElementById: () => null}
    };
    await new Function(...Object.keys(mocks), 'id', 'button',
      source + ';return registrarHistoricoFiscalizacaoMandato(id,button);'
    )(...Object.values(mocks), id, button);
    assert.equal(networkCalls, 0, name);
    assert.equal(button.disabled, false, name);
    if (name === 'tipo-invalido' || name === 'descricao-curta' || name === 'protocolo-longo')
      assert.equal(alerts.length, 1, name);
    else assert.equal(alerts.length, 0, name);
  }
  console.log('OK: 7 cenarios de validacao de entrada, sem rede');
})().catch(error => {console.error(error);process.exitCode=1});
