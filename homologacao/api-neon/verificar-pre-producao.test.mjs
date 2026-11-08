import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const pasta=dirname(fileURLToPath(import.meta.url));
const verificar=join(pasta,'verificar-pre-producao.mjs');
test('pré-produção sem evidências falha fechada e lista requisitos',()=>{
 const r=spawnSync(process.execPath,[verificar],{encoding:'utf8'});
 assert.equal(r.status,1);
 const corpo=JSON.parse(r.stdout);
 assert.equal(corpo.liberacao,'BLOQUEADA');
 assert.ok(corpo.pendentes.includes('aprovacao_explicita_implantacao'));
 assert.ok(corpo.pendentes.includes('protocolos_legados_acessiveis_com_chave'));
});
test('arquivo inexistente não libera produção',()=>{
 const r=spawnSync(process.execPath,[verificar,join(pasta,'arquivo-que-nao-existe.json')],{encoding:'utf8'});
 assert.equal(r.status,2);
 assert.match(r.stderr,/BLOQUEADO/);
});
