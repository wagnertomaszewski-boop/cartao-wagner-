import test from 'node:test';
import assert from 'node:assert/strict';
import {criarVerificacaoWhatsapp} from './verificacao-whatsapp.mjs';
function fixture({enviado=true}={}){
 let enviadoCodigo='',desafio=null,usado=false,tentativas=0;
 const verificar=criarVerificacaoWhatsapp({
  segredo:'segredo-de-homologacao-32-caracteres-no-minimo',
  agora:()=>1762600000000,
  buscarContatoConfirmado:async()=>({telefone:'+55519999999999'}),
  enviarCodigo:async({codigo})=>{enviadoCodigo=codigo;return enviado;},
  armazenarDesafio:async d=>{desafio=d;},
  obterDesafio:async()=>{tentativas++;return usado||tentativas>5?null:desafio;},
  consumirDesafio:async()=>{usado=true;return true;}
 });
 return {verificar,codigo:()=>enviadoCodigo};
}
test('código de seis dígitos valida uma única vez',async()=>{
 const f=fixture();
 const d=await f.verificar.solicitar({solicitacaoId:'900020',acao:'emitir'});
 assert.match(f.codigo(),/^[0-9]{6}$/);
 const args={desafioId:d.desafioId,codigo:f.codigo(),solicitacaoId:'900020',acao:'emitir'};
 assert.equal(await f.verificar.confirmar(args),true);
 assert.equal(await f.verificar.confirmar(args),false);
});
test('código errado ou ação diferente são negados',async()=>{
 const f=fixture();const d=await f.verificar.solicitar({solicitacaoId:'900020',acao:'emitir'});
 assert.equal(await f.verificar.confirmar({desafioId:d.desafioId,codigo:'abcdef',solicitacaoId:'900020',acao:'emitir'}),false);
 assert.equal(await f.verificar.confirmar({desafioId:d.desafioId,codigo:f.codigo(),solicitacaoId:'900020',acao:'revogar'}),false);
});
test('não confirma sem entrega pelo provedor',async()=>{
 const f=fixture({enviado:false});
 await assert.rejects(f.verificar.solicitar({solicitacaoId:'900020',acao:'emitir'}),/Não foi possível preparar/);
});
