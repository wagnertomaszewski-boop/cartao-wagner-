import test from 'node:test';
import assert from 'node:assert/strict';
import {criarOperacoesConfirmacaoCidadao} from './confirmacao-cidadao.mjs';
test('confirmação pública usa apenas a confirmação atômica do repositório',async()=>{
 const chamadas=[];
 const ops=criarOperacoesConfirmacaoCidadao({verificacao:{confirmar:async x=>{chamadas.push(x);return x.codigo==='123456';}}});
 const base={desafioId:'a'.repeat(32),solicitacaoId:'900020',acao:'emitir'};
 assert.deepEqual(await ops.confirmar({dados:{...base,codigo:'000000'}}),{confirmado:false});
 assert.deepEqual(await ops.confirmar({dados:{...base,codigo:'123456'}}),{confirmado:true});
 assert.equal(chamadas.length,2);
});
test('não aceita dados inválidos e falha fechada sem integração',async()=>{
 assert.throws(()=>criarOperacoesConfirmacaoCidadao({}),/obrigatória/);
 const ops=criarOperacoesConfirmacaoCidadao({verificacao:{confirmar:async()=>true}});
 await assert.rejects(ops.confirmar({dados:{solicitacaoId:'900020',desafioId:'x',codigo:'123456',acao:'emitir'}}),/inválidos/);
});
