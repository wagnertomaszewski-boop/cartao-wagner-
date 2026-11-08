import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarEmissorChaves} from './emissao-chaves.mjs';
import {criarGravadorHashChave} from './gravar-hash-chave.mjs';
import {criarConsultaComChave} from './consulta-chave-privada.mjs';

// Banco sintético em memória: simula a semântica INSERT ON CONFLICT,
// a correspondência do hash e a revogação. NÃO é um teste de PostgreSQL real.
test('fluxo integrado: emitir, gravar, consultar, negar chave errada e revogar',async()=>{
 const registros=new Map();
 const protocolo='2026-000001';
 const operadorId='123e4567-e89b-42d3-a456-426614174000';
 const executarGravacao=async(sql,[id,hash,operador])=>{
  assert.match(sql,/ON CONFLICT \(solicitacao_id\) DO NOTHING/);
  assert.equal(operador,operadorId);
  if(registros.has(id))return {rowCount:0,rows:[]};
  registros.set(id,{hash:Buffer.from(hash),revogado:false});
  return {rowCount:1,rows:[{solicitacao_id:id}]};
 };
 const executarConsulta=async(sql,[protocoloRecebido,hash])=>{
  assert.match(sql,/c\.revogada_em IS NULL/);
  const registro=registros.get('12');
  return {rows:protocoloRecebido===protocolo&&registro&&!registro.revogado&&registro.hash.equals(hash)
   ? [{assunto:'Iluminação',status:'Recebido',nome:'NÃO EXIBIR'}]:[]};
 };
 const emissor=criarEmissorChaves({
  verificarIdentidade:async()=>true,
  autorizarEmissao:async()=>true,
  gravarHash:criarGravadorHashChave({executar:executarGravacao})
 });
 const consultar=criarConsultaComChave({executar:executarConsulta});
 const {chave}=await emissor.emitir({solicitacaoId:'12',operadorId,contextoServidor:{sessao:true}});
 assert.deepEqual(await consultar({protocolo,chave}),[{assunto:'Iluminação',status:'Recebido'}]);
 assert.deepEqual(await consultar({protocolo,chave:'A'.repeat(43)}),[]);
 assert.deepEqual(await consultar({protocolo:'2026-000002',chave}),[]);
 await assert.rejects(emissor.emitir({solicitacaoId:'12',operadorId,contextoServidor:{sessao:true}}),/não concluída/);
 registros.get('12').revogado=true;
 assert.deepEqual(await consultar({protocolo,chave}),[]);
});
