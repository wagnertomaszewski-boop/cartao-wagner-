import test from 'node:test';
import assert from 'node:assert/strict';
import { criarLimitadorTeste } from './limitador-teste.mjs';
test('bloqueia na sexta tentativa e reinicia após janela', async () => {
  let relogio=1000;
  const limitar=criarLimitadorTeste({limite:5,janelaMs:60000,agora:()=>relogio});
  for(let i=0;i<5;i++) assert.equal(await limitar({origem:'teste',protocolo:'2026-TESTE'}),true);
  assert.equal(await limitar({origem:'teste',protocolo:'2026-TESTE'}),false);
  relogio+=60000;
  assert.equal(await limitar({origem:'teste',protocolo:'2026-TESTE'}),true);
});
test('não aceita origem vazia e separa origens', async () => {
  const limitar=criarLimitadorTeste({limite:1});
  assert.equal(await limitar({origem:'',protocolo:'2026-TESTE'}),false);
  assert.equal(await limitar({origem:'A',protocolo:'2026-TESTE'}),true);
  assert.equal(await limitar({origem:'A',protocolo:'2026-TESTE'}),false);
  assert.equal(await limitar({origem:'B',protocolo:'2026-TESTE'}),true);
});
