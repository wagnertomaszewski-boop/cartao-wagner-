import test from 'node:test';
import assert from 'node:assert/strict';
import {criarFonteDecisaoNeon} from './fonte-decisao-neon.mjs';
const protocolo='LEGADO-EMISSAO-TESTE-900006',referenciaOperador='OP-TESTE-900006';
test('consulta somente RPC privada parametrizada',async()=>{
 const consultarDecisao=criarFonteDecisaoNeon({consultar:async(sql,args)=>{
  assert.match(sql,/^SELECT protocolo, operador,/);
  assert.match(sql,/mandato_testes\.consultar_decisao_identidade_privada\(\$1,\$2\)/);
  assert.deepEqual(args,[protocolo,referenciaOperador]);
  return [{protocolo,operador:referenciaOperador,status:'aprovado'}];
 }});
 assert.equal((await consultarDecisao({protocolo,referenciaOperador})).status,'aprovado');
});
test('bloqueia decisão ausente, duplicada ou parâmetros inválidos',async()=>{
 const vazia=criarFonteDecisaoNeon({consultar:async()=>[]});
 await assert.rejects(()=>vazia({protocolo,referenciaOperador}),/indisponível/);
 const duplicada=criarFonteDecisaoNeon({consultar:async()=>[{},{}]});
 await assert.rejects(()=>duplicada({protocolo,referenciaOperador}),/ambígua/);
 await assert.rejects(()=>vazia({protocolo:'a,or.(id.gt.0)',referenciaOperador}),/inválidos/);
});
