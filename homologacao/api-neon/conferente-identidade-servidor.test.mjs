import test from 'node:test';
import assert from 'node:assert/strict';
import {criarConferenteIdentidadeServidor} from './conferente-identidade-servidor.mjs';
const operadorId='123e4567-e89b-42d3-a456-426614174000';
const agora=1762600000000;
const pedido={solicitacaoId:'900020',operadorId,acao:'emitir',
 confirmacaoWhatsapp:true,conferenciaPessoal:true,reautenticacaoRecente:true};
const fontes=()=>({
 consultarWhatsappConfirmado:async()=>({confirmado:true,solicitacaoId:'900020'}),
 consultarConferenciaPessoal:async()=>({confirmado:true,solicitacaoId:'900020',operadorId,justificativa:'Titularidade confirmada presencialmente pelo vereador.'}),
 consultarReautenticacao:async()=>({confirmado:true,operadorId,confirmadoEm:agora-60000}),
 agora:()=>agora
});
test('três fontes privadas vinculadas à solicitação e operador liberam somente evidência validada',async()=>{
 const confirmar=criarConferenteIdentidadeServidor(fontes());
 assert.equal((await confirmar(pedido)).reautenticacaoRecente,true);
});
test('não confia em marcações do navegador quando WhatsApp ou conferência negam',async()=>{
 const a=fontes();a.consultarWhatsappConfirmado=async()=>({confirmado:false,solicitacaoId:'900020'});
 assert.equal(await criarConferenteIdentidadeServidor(a)(pedido),false);
 const b=fontes();b.consultarConferenciaPessoal=async()=>({confirmado:false,solicitacaoId:'900020',operadorId});
 assert.equal(await criarConferenteIdentidadeServidor(b)(pedido),false);
});
test('reautenticação antiga, futura ou de outro operador é rejeitada',async()=>{
 for(const confirmadoEm of [agora-300001,agora+1]){
  const a=fontes();a.consultarReautenticacao=async()=>({confirmado:true,operadorId,confirmadoEm});
  assert.equal(await criarConferenteIdentidadeServidor(a)(pedido),false);
 }
 const b=fontes();b.consultarReautenticacao=async()=>({confirmado:true,operadorId:'123e4567-e89b-42d3-a456-426614174001',confirmadoEm:agora});
 assert.equal(await criarConferenteIdentidadeServidor(b)(pedido),false);
});
test('fontes ausentes, inconsistentes ou com erro falham fechadas',async()=>{
 assert.throws(()=>criarConferenteIdentidadeServidor({}),/fontes independentes/);
 const a=fontes();a.consultarWhatsappConfirmado=async()=>{throw Error('indisponível')};
 assert.equal(await criarConferenteIdentidadeServidor(a)(pedido),false);
 const b=fontes();b.consultarConferenciaPessoal=async()=>({confirmado:true,solicitacaoId:'900021',operadorId,justificativa:'Titularidade confirmada presencialmente pelo vereador.'});
 assert.equal(await criarConferenteIdentidadeServidor(b)(pedido),false);
});
