import test from 'node:test';
import assert from 'node:assert/strict';
import {criarVerificadorVinculoLegado} from './verificar-vinculo-legado.mjs';
test('aceita apenas comprovante válido com vínculo exato ao protocolo',async()=>{
 const verificar=criarVerificadorVinculoLegado({
  validarComprovante:async({comprovante})=>comprovante==='validado-internamente',
  buscarVinculo:async({protocolo})=>({protocolo,solicitacaoId:900004})
 });
 assert.deepEqual(await verificar({protocolo:'LEGADO-TESTE',comprovante:'validado-internamente'}),{solicitacaoId:900004});
 assert.equal(await verificar({protocolo:'LEGADO-TESTE',comprovante:'nao-validado'}),false);
});
test('rejeita vínculo divergente, ID inválido e ausência de fonte confiável',async()=>{
 const verificar=criarVerificadorVinculoLegado({
  validarComprovante:async()=>true,
  buscarVinculo:async()=>({protocolo:'OUTRO',solicitacaoId:900004})
 });
 assert.equal(await verificar({protocolo:'LEGADO-TESTE',comprovante:'x'}),false);
 assert.throws(()=>criarVerificadorVinculoLegado({buscarVinculo:async()=>({})}),/obrigatórias/);
});
