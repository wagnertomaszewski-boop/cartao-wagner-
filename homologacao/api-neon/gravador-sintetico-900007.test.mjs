import test from 'node:test';
import assert from 'node:assert/strict';
import {criarGravadorSintetico900007} from './gravador-sintetico-900007.mjs';
const correto={protocolo:'LEGADO-EMISSAO-TESTE-900007',referenciaOperador:'OP-TESTE-900007',registroId:'REG-TESTE-900007',identidadeVerificada:true,evidenciaConferida:true,status:'aprovado'};
test('adaptador usa somente RPC restrita e parâmetros SQL',async()=>{
 let chamadas=0;
 const gravar=criarGravadorSintetico900007({consultarNeon:async(sql,params)=>{
  chamadas++;assert.match(sql,/registrar_decisao_sintetica_900007\(\$1,\$2,\$3\)/);
  assert.deepEqual(params,[correto.protocolo,correto.referenciaOperador,correto.registroId]);
  return [{id:'1'}];
 }});
 assert.deepEqual(await gravar(correto),{registroId:correto.registroId,id:'1'});
 assert.equal(chamadas,1);
});
test('bloqueia dados reais e flags falsas antes de consultar banco',async()=>{
 let chamadas=0;
 const gravar=criarGravadorSintetico900007({consultarNeon:async()=>{chamadas++;return [{id:1}]}});
 for(const alteracao of [{protocolo:'REAL-123'},{referenciaOperador:'OP-OUTRO'},{registroId:'REG-OUTRO'},{identidadeVerificada:false},{evidenciaConferida:false},{status:'rejeitado'}]){
  await assert.rejects(()=>gravar({...correto,...alteracao}),/Fora do escopo/);
 }
 assert.equal(chamadas,0);
});
test('resposta inválida falha fechada',async()=>{
 const gravar=criarGravadorSintetico900007({consultarNeon:async()=>[{id:'abc'}]});
 await assert.rejects(()=>gravar(correto),/Resposta de gravação inválida/);
});
