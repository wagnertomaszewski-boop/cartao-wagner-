import test from 'node:test';
import assert from 'node:assert/strict';
import {criarOperacoesConfirmacaoCidadao} from './confirmacao-cidadao.mjs';
test('confirmação pública só registra após código válido',async()=>{
 const registrados=[];
 const ops=criarOperacoesConfirmacaoCidadao({
  verificacao:{confirmar:async({codigo})=>codigo==='123456'},
  registrarConfirmacao:async x=>{registrados.push(x);}
 });
 const base={desafioId:'a'.repeat(32),solicitacaoId:'900020',acao:'emitir'};
 assert.deepEqual(await ops.confirmar({dados:{...base,codigo:'000000'}}),{confirmado:false});
 assert.equal(registrados.length,0);
 assert.deepEqual(await ops.confirmar({dados:{...base,codigo:'123456'}}),{confirmado:true});
 assert.equal(registrados.length,1);
});
test('não aceita dados inválidos e falha fechada sem integração',async()=>{
 assert.throws(()=>criarOperacoesConfirmacaoCidadao({}),/obrigatórios/);
 const ops=criarOperacoesConfirmacaoCidadao({verificacao:{confirmar:async()=>true},registrarConfirmacao:async()=>{}});
 await assert.rejects(ops.confirmar({dados:{solicitacaoId:'900020',desafioId:'x',codigo:'123456',acao:'emitir'}}),/inválidos/);
});
