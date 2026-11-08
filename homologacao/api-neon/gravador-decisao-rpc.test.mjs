import test from 'node:test';
import assert from 'node:assert/strict';
import {criarGravadorDecisaoRpc} from './gravador-decisao-rpc.mjs';
const base={protocolo:'LEGADO-EMISSAO-TESTE-900006',referenciaOperador:'OP-TESTE-900006',registroId:'REG-TESTE-900006',identidadeVerificada:true,evidenciaConferida:true,status:'aprovado'};
test('usa somente RPC parametrizada e confirma ID retornado',async()=>{
 const gravar=criarGravadorDecisaoRpc({consultarNeon:async(sql,args)=>{
  assert.equal(sql,'SELECT mandato_testes.registrar_decisao_identidade_privada($1,$2,$3,$4,$5,$6) AS id');
  assert.deepEqual(args,[base.protocolo,base.referenciaOperador,base.registroId,true,true,'aprovado']);
  return [{id:17}];
 }});
 assert.deepEqual(await gravar(base),{registroId:base.registroId,id:17});
});
test('recusa aprovação não confirmada e resposta ambígua',async()=>{
 let chamadas=0;
 const gravar=criarGravadorDecisaoRpc({consultarNeon:async()=>{chamadas++;return [];}});
 await assert.rejects(()=>gravar({...base,evidenciaConferida:false}),/inválida/);
 assert.equal(chamadas,0);
 await assert.rejects(()=>gravar(base),/não confirmado/);
});
