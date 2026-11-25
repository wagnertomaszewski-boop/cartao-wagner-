import assert from 'node:assert/strict';
import test from 'node:test';
import {mascararTelefone,normalizarTelefoneRecuperacao} from '../web/telefone.mjs';
import {criarClienteWeb} from '../web/cliente.mjs';

test('WhatsApp aceita digitação nacional e cola com ou sem código do Brasil',()=>{
 for(const valor of ['51988887777','(51) 98888-7777','+55 (51) 98888-7777','5551988887777']){
  assert.equal(mascararTelefone(valor),'(51) 98888-7777');
  assert.equal(normalizarTelefoneRecuperacao(valor),'+5551988887777');
 }
 assert.equal(mascararTelefone('51988'),'(51) 988');
 assert.equal(mascararTelefone('55988887777'),'(55) 98888-7777');
 assert.equal(normalizarTelefoneRecuperacao('55988887777'),'+5555988887777');
});

test('números antigos mantêm oito dígitos e entradas incompletas não mudam de destino',()=>{
 assert.equal(mascararTelefone('+555188887777'),'(51) 8888-7777');
 assert.equal(normalizarTelefoneRecuperacao('(51) 8888-7777'),'+555188887777');
 for(const valor of ['+55 98888-7777','+55 +55 51988887777','+1 212 555 0100','(51) 98888-77777']){
  assert.equal(mascararTelefone(valor),valor);
  assert.throws(()=>normalizarTelefoneRecuperacao(valor));
 }
 assert.throws(()=>normalizarTelefoneRecuperacao('51 98888-7777 ramal 1'));
});

test('cadastro, recuperação e confirmação enviam o mesmo telefone internacional',async()=>{
 const chamadas=[];
 const config={ambiente:'producao',projeto:'pmmsdjozyyxkbuqlkfpb',apiBase:'https://api.exemplo.org',versao:'a'.repeat(40)};
 const api=criarClienteWeb(config,async(url,opcoes)=>{
  chamadas.push({rota:url.split('/v1/')[1],dados:JSON.parse(opcoes.body),opcoes});
  return {ok:true,json:async()=>({})};
 });
 const valor='(51) 98888-7777',esperado='+5551988887777';
 await api.cadastrar({p_whatsapp:valor});
 await api.solicitarNavegador({protocolo:'TESTE',telefone:valor});
 await api.admin('emitir',{pedidoId:'teste',telefoneConfirmado:normalizarTelefoneRecuperacao(valor)},'sessao-sintetica');
 assert.deepEqual(chamadas.map(c=>c.rota),['solicitacoes/cadastrar','recuperacao/navegador/solicitar','admin/recuperacao/emitir']);
 assert.deepEqual(chamadas.map(c=>Object.values(c.dados).at(-1)),[esperado,esperado,esperado]);
 assert.equal(chamadas[1].opcoes.credentials,'include');
 assert.equal(chamadas[2].opcoes.headers.Authorization,'Bearer sessao-sintetica');
});
