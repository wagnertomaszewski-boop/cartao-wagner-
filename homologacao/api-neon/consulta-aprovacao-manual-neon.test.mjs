import test from 'node:test';
import assert from 'node:assert/strict';
import {criarConsultaAprovacaoManualNeon} from './consulta-aprovacao-manual-neon.mjs';
const operadorId='123e4567-e89b-42d3-a456-426614174000';
test('aprovação pessoal exige solicitação, operador, ação, validade e não revogação',async()=>{
 let params;
 const consultar=criarConsultaAprovacaoManualNeon({pool:{query:async(sql,args)=>{
  params=args;assert.match(sql,/revogada_em IS NULL/);assert.match(sql,/expira_em>now\(\)/);
  return {rows:[{solicitacao_id:'900020',operador_id:operadorId,justificativa:'Confirmação pessoal feita pelo vereador.'}]};
 }}});
 const resultado=await consultar({solicitacaoId:'900020',operadorId,acao:'emitir'});
 assert.equal(resultado.confirmado,true);
 assert.deepEqual(params,['900020',operadorId,'emitir']);
});
test('falha fechada se não houver registro, ação inválida ou banco indisponível',async()=>{
 const consultar=criarConsultaAprovacaoManualNeon({pool:{query:async()=>({rows:[]})}});
 assert.equal((await consultar({solicitacaoId:'900020',operadorId,acao:'emitir'})).confirmado,false);
 assert.equal((await consultar({solicitacaoId:'900020',operadorId,acao:'recuperar'})).confirmado,false);
 const falha=criarConsultaAprovacaoManualNeon({pool:{query:async()=>{throw Error('indisponível')}}});
 assert.equal((await falha({solicitacaoId:'900020',operadorId,acao:'emitir'})).confirmado,false);
});
