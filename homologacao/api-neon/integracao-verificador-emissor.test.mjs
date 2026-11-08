import test from 'node:test';
import assert from 'node:assert/strict';
import {criarVerificadorVinculoLegado} from './verificar-vinculo-legado.mjs';
import {criarEmissorLegado} from './emissao-legada-interna.mjs';
test('integração: vínculo correto autoriza emissão e grava hash sem chave aberta',async()=>{
 const registros=[];
 const verificarIdentidade=criarVerificadorVinculoLegado({
  validarComprovante:async({comprovante})=>comprovante==='comprovante-conferido',
  buscarVinculo:async()=>({protocolo:'LEGADO-TESTE',solicitacaoId:900004})
 });
 const emissor=criarEmissorLegado({verificarIdentidade,
  auditar:async e=>registros.push({tipo:'auditoria',...e}),
  persistirHash:async d=>registros.push({tipo:'persistencia',...d})
 });
 const retorno=await emissor.emitir({protocolo:'LEGADO-TESTE',comprovante:'comprovante-conferido'});
 assert.equal(retorno.protocolo,'LEGADO-TESTE');
 assert.match(retorno.chave,/^[a-f0-9]{64}$/);
 assert.equal(registros[1].solicitacaoId,900004);
 assert.notEqual(registros[1].hash,retorno.chave);
 assert.equal(registros[1].chave,undefined);
 assert.deepEqual(registros.map(x=>x.tipo),['auditoria','persistencia']);
});
test('integração: vínculo divergente bloqueia emissão sem efeitos',async()=>{
 let efeitos=0;
 const verificarIdentidade=criarVerificadorVinculoLegado({
  validarComprovante:async()=>true,
  buscarVinculo:async()=>({protocolo:'PROTOCOLO-DIFERENTE',solicitacaoId:900004})
 });
 const emissor=criarEmissorLegado({verificarIdentidade,
  auditar:async()=>{efeitos++},
  persistirHash:async()=>{efeitos++}
 });
 await assert.rejects(()=>emissor.emitir({protocolo:'LEGADO-TESTE',comprovante:'x'}),/Identidade não confirmada/);
 assert.equal(efeitos,0);
});

test('integração: espaços externos são normalizados em validação e gravação',async()=>{
 let persistido;
 const verificarIdentidade=criarVerificadorVinculoLegado({
  validarComprovante:async()=>true,
  buscarVinculo:async({protocolo})=>({protocolo,solicitacaoId:900004})
 });
 const emissor=criarEmissorLegado({verificarIdentidade,
  auditar:async()=>{},persistirHash:async dados=>{persistido=dados}
 });
 const retorno=await emissor.emitir({protocolo:'  LEGADO-TESTE  ',comprovante:'x'});
 assert.equal(retorno.protocolo,'LEGADO-TESTE');
 assert.equal(persistido.protocolo,'LEGADO-TESTE');
});
