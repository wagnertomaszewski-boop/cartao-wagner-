import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarFluxoRecuperacaoAutomatico} from './fluxo-recuperacao-automatico.mjs';
import {criarDesafiosRecuperacao} from './desafio-recuperacao.mjs';

const segredo='segredo-ficticio-de-homologacao-com-mais-de-32-bytes';
const novoDesafio=()=>criarDesafiosRecuperacao({segredo,gerarCodigo:()=> '123456'});
const contato={pedidoId:'id-ficticio',destino:'numero-ficticio',verificado:true};
const resposta='Se os dados permitirem, enviaremos instruções de recuperação.';
test('exige dependências de servidor',()=>{
 assert.throws(()=>criarFluxoRecuperacaoAutomatico({}));
});
test('não revela existência de protocolo nem envia a contatos não verificados',async()=>{
 let envios=0;
 const fluxo=criarFluxoRecuperacaoAutomatico({
  localizarContatoVerificado:async protocolo=>protocolo==='existe'?{...contato,verificado:false}:null,
  enviarCodigo:async()=>{envios++;},desafios:novoDesafio()
 });
 assert.deepEqual(await fluxo.solicitar({protocolo:'existe'}),{mensagem:resposta});
 assert.deepEqual(await fluxo.solicitar({protocolo:'nao-existe'}),{mensagem:resposta});
 assert.equal(envios,0);
});
test('envia somente para contato previamente verificado',async()=>{
 const envios=[];
 const desafios=novoDesafio();
 const fluxo=criarFluxoRecuperacaoAutomatico({
  localizarContatoVerificado:async()=>contato,
  enviarCodigo:async dados=>envios.push(dados),desafios
 });
 assert.deepEqual(await fluxo.solicitar({protocolo:'ficticio'}),{mensagem:resposta});
 assert.deepEqual(envios,[{destino:'numero-ficticio',codigo:'123456'}]);
 assert.equal(fluxo.confirmarInternamente({pedidoId:'outro',codigo:'123456'}),false);
 assert.equal(fluxo.confirmarInternamente({pedidoId:'id-ficticio',codigo:'123456'}),true);
 assert.equal(fluxo.confirmarInternamente({pedidoId:'id-ficticio',codigo:'123456'}),false);
});
test('falha no provedor invalida código e mantém resposta uniforme',async()=>{
 const desafios=novoDesafio();
 const fluxo=criarFluxoRecuperacaoAutomatico({
  localizarContatoVerificado:async()=>contato,
  enviarCodigo:async()=>{throw Error('provedor indisponível');},desafios
 });
 assert.deepEqual(await fluxo.solicitar({protocolo:'ficticio'}),{mensagem:resposta});
 assert.equal(fluxo.confirmarInternamente({pedidoId:'id-ficticio',codigo:'123456'}),false);
});
test('falha na consulta de contato não expõe erro interno',async()=>{
 const fluxo=criarFluxoRecuperacaoAutomatico({
  localizarContatoVerificado:async()=>{throw Error('falha interna');},
  enviarCodigo:async()=>{throw Error('não deve chamar');},desafios:novoDesafio()
 });
 assert.deepEqual(await fluxo.solicitar({protocolo:'ficticio'}),{mensagem:resposta});
});
