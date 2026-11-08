import test from 'node:test';
import assert from 'node:assert/strict';
import {criarEmissorComVinculoLegado} from './emissor-com-vinculo-legado.mjs';
test('composição exige fonte privada e comprovante verificado',()=>{
 assert.throws(()=>criarEmissorComVinculoLegado({}),/Consulta privada/);
 assert.throws(()=>criarEmissorComVinculoLegado({consultarSupabasePrivado:async()=>[]}),/Conferência independente/);
});
test('comprovante negado impede consultas Neon e emissão',async()=>{
 let consultas=0;
 const emissor=criarEmissorComVinculoLegado({
  poolNeon:{connect:async()=>{consultas++;throw Error('Não deveria conectar')}},
  consultarSupabasePrivado:async()=>{consultas++;return [{id:900005,protocolo:'LEGADO-900005'}]},
  validarComprovante:async()=>false,
  auditarTentativa:async()=>{}
 });
 await assert.rejects(()=>emissor.emitir({protocolo:'LEGADO-900005',comprovante:'invalido'}),/Identidade não confirmada/);
 assert.equal(consultas,0);
});
test('vínculo divergente bloqueia antes de consultar aprovação Neon',async()=>{
 let conectou=false;
 const emissor=criarEmissorComVinculoLegado({
  poolNeon:{connect:async()=>{conectou=true;throw Error('Não deveria conectar')}},
  consultarSupabasePrivado:async()=>[{id:900005,protocolo:'OUTRO'}],
  validarComprovante:async()=>true,
  auditarTentativa:async()=>{}
 });
 await assert.rejects(()=>emissor.emitir({protocolo:'LEGADO-900005',comprovante:'conferido'}),/Identidade não confirmada/);
 assert.equal(conectou,false);
});
