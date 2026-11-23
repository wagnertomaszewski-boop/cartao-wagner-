import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,timingSafeEqual} from 'node:crypto';
import {criarVerificadorPossePorDesafio} from '../conferente-externo/verificador-posse-por-desafio.mjs';
import {criarEmissorExternoPorRecibo} from '../conferente-externo/emitir-atestado-por-recibo.mjs';
import {criarVerificadorContatoIndependente} from '../verificador-contato-independente.mjs';

const verifier=generateKeyPairSync('ed25519');
const conferente=generateKeyPairSync('ed25519');
const verificadorId='00000000-0000-4000-8000-000000000015';
const conferenteId='00000000-0000-4000-8000-000000000013';
const operadorId='00000000-0000-4000-8000-000000000012';
const pedidoId='00000000-0000-4000-8000-000000000011';
const ctx={pedidoId,solicitacaoId:'123',operadorId,
 telefoneOriginal:'+555188887777',telefoneNovo:'+5551999988888'};
const início=Date.parse('2026-11-22T23:15:00.000Z');

// Repositório SOMENTE DE TESTE em memória. Referência das invariantes que
// o adaptador PostgreSQL transacional precisará implementar em um serviço externo.
function laboratorio({autorizar=true,aceitarEntrega=true,aceitarRecibo=true}={}){
 let relogio=início,entradas=0;
 const registros=new Map(),enviados=[],recebidos=[];
 const persistencia={
  async criar(d){
   const hora=Date.parse(d.criadoEm);
   if([...registros.values()].some(r=>r.contexto.pedidoId===d.contexto.pedidoId))
    return false;
   if([...registros.values()].filter(r=>r.telefoneHash.equals(d.telefoneHash)&&hora-r.criadoEm<3600000).length>=3)
    return false;
   registros.set(d.desafioId,{...d,criadoEm:hora,tentativas:0,consumido:false,revogado:false});
   return true;
  },
  async verificar({desafioId,codigoVerificador,confirmadoEm}){
   const r=registros.get(desafioId),agora=Date.parse(confirmadoEm);
   if(!r||r.revogado||r.consumido||r.tentativas>=5||agora>=Date.parse(r.expiraEm)||agora<r.criadoEm)
    return null;
   // Nenhum await entre conferência e consumo: simula a atomicidade exigida.
   r.tentativas++;
   if(!timingSafeEqual(r.codigoVerificador,codigoVerificador))return null;
   r.consumido=true;
   return {evidenciaId:r.evidenciaId,contexto:r.contexto};
  },
  async revogar({desafioId}){const r=registros.get(desafioId);if(r)r.revogado=true;}
 };
 const obterContexto=async({pedidoId:id,operadorId:op})=>{
  entradas++;
  return autorizar?{...ctx,pedidoId:id,operadorId:op}:null;
 };
 const servico=criarVerificadorPossePorDesafio({
  chavePrivadaVerificador:verifier.privateKey,verificadorId,
  segredoDesafios:'segredo-isolado-de-testes-com-mais-de-trinta-e-dois-bytes',
  buscarContextoAutorizado:obterContexto,
  enviarDesafio:async(d)=>{enviados.push(d);return aceitarEntrega;},
  persistencia,
  registrarReciboPrivado:async (v)=>{if(!aceitarRecibo)return false;recebidos.push(v);return true;},
  relogio:()=>relogio
 });
 return {servico,registros,enviados,recebidos,entradas:()=>entradas,
  avancar:ms=>{relogio+=ms;},agora:()=>relogio};
}

test('desafio chega somente ao transporte, código fica HMAC e confirmação gera recibo privado',async()=>{
 const a=laboratorio();
 const pedido=await a.servico.iniciar({pedidoId,operadorId});
 assert.match(pedido.desafioId,/^[0-9a-f-]{36}$/);
 assert.equal(Object.hasOwn(pedido,'codigo'),false);
 assert.equal(Object.hasOwn(pedido,'telefoneNovo'),false);
 assert.equal(a.enviados.length,1);
 const envio=a.enviados[0],registro=a.registros.get(pedido.desafioId);
 assert.equal(envio.telefoneNovo,ctx.telefoneNovo);
 assert.match(envio.codigo,/^\d{6}$/);
 assert.equal(Buffer.isBuffer(registro.codigoVerificador),true);
 assert.equal(registro.codigoVerificador.length,32);
 assert.equal(JSON.stringify(registro).includes(envio.codigo),false);
 assert.equal((await a.servico.confirmar({desafioId:pedido.desafioId,codigo:'ABC123'})).confirmado,false);
 const errado=envio.codigo==='000000'?'111111':'000000';
 assert.equal((await a.servico.confirmar({desafioId:pedido.desafioId,codigo:errado})).confirmado,false);
 assert.equal((await a.servico.confirmar({desafioId:pedido.desafioId,codigo:envio.codigo})).confirmado,true);
 assert.equal(a.recebidos.length,1);
 assert.equal((await a.servico.confirmar({desafioId:pedido.desafioId,codigo:envio.codigo})).confirmado,false);
 assert.equal(a.recebidos.length,1);
 const recibo=a.recebidos[0].recibo;
 const emitir=criarEmissorExternoPorRecibo({
  chavePrivadaConferente:conferente.privateKey,
  chavePublicaVerificador:verifier.publicKey,conferenteId,
  verificadoresPermitidos:[verificadorId],relogio:a.agora
 });
 const atestado=emitir({recibo,contexto:ctx});
 assert.equal(typeof atestado?.assinatura,'string');
 const validar=criarVerificadorContatoIndependente({
  chavePublicaConferente:conferente.publicKey,
  conferentesPermitidos:[conferenteId],
  buscarAtestado:async()=>atestado,relogio:a.agora
 });
 assert.equal((await validar(ctx))?.validado,true);
 assert.equal(Object.hasOwn(recibo,'codigo'),false);
 assert.equal(Object.hasOwn(recibo,'chavePrivada'),false);
});

test('bloqueia após cinco códigos errados e não emite recibo',async()=>{
 const a=laboratorio();
 const p=await a.servico.iniciar({pedidoId,operadorId});
 const codigo=a.enviados[0].codigo,errado=codigo==='000000'?'111111':'000000';
 for(let i=0;i<5;i++)assert.equal((await a.servico.confirmar({desafioId:p.desafioId,codigo:errado})).confirmado,false);
 assert.equal((await a.servico.confirmar({desafioId:p.desafioId,codigo})).confirmado,false);
 assert.equal(a.registros.get(p.desafioId).tentativas,5);
 assert.equal(a.recebidos.length,0);
});

test('recusa após cinco minutos e impede confirmação concorrente dupla',async()=>{
 const a=laboratorio();
 const p=await a.servico.iniciar({pedidoId,operadorId});
 a.avancar(300000);
 assert.equal((await a.servico.confirmar({desafioId:p.desafioId,codigo:a.enviados[0].codigo})).confirmado,false);
 assert.equal(a.recebidos.length,0);
 const b=laboratorio();
 const q=await b.servico.iniciar({pedidoId,operadorId});
 const respostas=await Promise.all([
  b.servico.confirmar({desafioId:q.desafioId,codigo:b.enviados[0].codigo}),
  b.servico.confirmar({desafioId:q.desafioId,codigo:b.enviados[0].codigo})
 ]);
 assert.equal(respostas.filter(x=>x.confirmado).length,1);
 assert.equal(b.recebidos.length,1);
});

test('prova de posse não nasce por checkbox, telefone arbitrário ou operador sem autorização',async()=>{
 const negado=laboratorio({autorizar:false});
 await assert.rejects(negado.servico.iniciar({pedidoId,operadorId}),/não autorizada/);
 assert.equal(negado.enviados.length,0);
 const a=laboratorio();
 await assert.rejects(a.servico.iniciar({pedidoId:'invalido',operadorId}),/não autorizada/);
 await assert.rejects(a.servico.iniciar({pedidoId,operadorId:verificadorId}),/não autorizada/);
 assert.equal(a.enviados.length,0);
 const p=await a.servico.iniciar({pedidoId,operadorId,telefoneNovo:'+5551999999999',contatoVerificado:true});
 assert.equal(a.enviados[0].telefoneNovo,ctx.telefoneNovo);
 assert.equal(Object.hasOwn(p,'contatoVerificado'),false);
 await assert.rejects(a.servico.iniciar({pedidoId,operadorId}),/indisponível/);
});

test('falha de transporte revoga o desafio sem confirmar posse',async()=>{
 const a=laboratorio({aceitarEntrega:false});
 await assert.rejects(a.servico.iniciar({pedidoId,operadorId}),/indisponível/);
 assert.equal(a.recebidos.length,0);
 const registro=[...a.registros.values()][0];
 assert.equal(registro.revogado,true);
 assert.equal((await a.servico.confirmar({desafioId:registro.desafioId,codigo:a.enviados[0].codigo})).confirmado,false);
});

test('falha no armazenamento do recibo mantém consumo único, sem liberar código',async()=>{
 const a=laboratorio({aceitarRecibo:false});
 const p=await a.servico.iniciar({pedidoId,operadorId});
 const codigo=a.enviados[0].codigo;
 await assert.rejects(a.servico.confirmar({desafioId:p.desafioId,codigo}),/Registro privado/);
 assert.equal(a.recebidos.length,0);
 assert.equal((await a.servico.confirmar({desafioId:p.desafioId,codigo})).confirmado,false);
});

test('rejeita configuração insegura, independência de chaves e abuso de tentativas',()=>{
 const cfg={chavePrivadaVerificador:verifier.privateKey,verificadorId,
  segredoDesafios:'x'.repeat(40),buscarContextoAutorizado:async()=>ctx,
  enviarDesafio:async()=>true,
  registrarReciboPrivado:async()=>true,
  persistencia:{criar:async()=>true,verificar:async()=>null,revogar:async()=>{}}};
 assert.throws(()=>criarVerificadorPossePorDesafio({...cfg,segredoDesafios:'curto'}),/incompleto/);
 assert.throws(()=>criarVerificadorPossePorDesafio({...cfg,enviarDesafio:null}),/incompleto/);
 assert.throws(()=>criarVerificadorPossePorDesafio({...cfg,chavePrivadaVerificador:verifier.publicKey}),/Ed25519|private/i);
});
