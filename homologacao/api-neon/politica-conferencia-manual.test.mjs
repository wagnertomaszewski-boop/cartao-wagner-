import test from 'node:test';
import assert from 'node:assert/strict';
import {validarConferenciaManual} from './politica-conferencia-manual.mjs';
const valido={solicitacaoId:'123',operadorId:'123e4567-e89b-42d3-a456-426614174000',confirmacaoWhatsapp:true,conferenciaPessoal:true,reatenticacaoRecente:true,justificativa:'Confirmei pessoalmente a titularidade da solicitação.'};
test('conferência manual exige todos os fatores, sem documentos',()=>{
 assert.equal(validarConferenciaManual(valido),true);
 for(const campo of ['confirmacaoWhatsapp','conferenciaPessoal','reatenticacaoRecente']){
  assert.equal(validarConferenciaManual({...valido,[campo]:false}),false);
  assert.equal(validarConferenciaManual({...valido,[campo]:undefined}),false);
 }
});
test('conferência rejeita identificadores e justificativas inválidos',()=>{
 assert.equal(validarConferenciaManual({...valido,operadorId:'admin'}),false);
 assert.equal(validarConferenciaManual({...valido,solicitacaoId:'0'}),false);
 assert.equal(validarConferenciaManual({...valido,justificativa:'ok'}),false);
 assert.equal(validarConferenciaManual({...valido,justificativa:'x'.repeat(501)}),false);
});
