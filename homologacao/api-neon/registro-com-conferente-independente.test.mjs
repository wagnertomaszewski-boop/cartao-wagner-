import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {criarRegistroComConferenteIndependente} from './registro-com-conferente-independente.mjs';
const {publicKey,privateKey}=generateKeyPairSync('ed25519');
const uid='11111111-1111-4111-8111-111111111111';
const protocolo='LEGADO-EMISSAO-TESTE-900006',referenciaOperador='OP-TESTE-900006',registroId='REG-TESTE-900006',agora=1794100000000;
const args={protocolo,referenciaOperador,registroId,tokenOperador:'token-de-operador-valido-de-homologacao'};
function montar({identidadeConfirmada=true,uidSessao=uid,conferente='REV-SEGUNDO-OPERADOR',auditoriaFalha=false}={}){
 const eventos=[];
 const d={protocolo,operador:referenciaOperador,registroId,conferenteId:conferente,
  verificada:true,identidadeConfirmada,verificadaEmMs:agora-1000};
 const mensagem=Buffer.from(JSON.stringify(['mandato-evidencia-v1',d.protocolo,d.operador,d.registroId,d.conferenteId,d.verificada,d.identidadeConfirmada,d.verificadaEmMs]));
 const atestado={dados:d,assinatura:sign(null,mensagem,privateKey).toString('base64url')};
 const registrar=criarRegistroComConferenteIndependente({
  supabaseUrl:'https://pmmsdjozyyxkbuqlkfpb.supabase.co',
  supabasePublishableKey:'sb_publishable_chave_ficticia_homologacao',
  operadoresPermitidos:{[uid]:referenciaOperador},
  buscarAuth:async()=>{eventos.push('auth');return {ok:true,json:async()=>({id:uidSessao,aud:'authenticated',is_anonymous:false})};},
  chavePublicaConferente:publicKey,conferentesPermitidos:['REV-SEGUNDO-OPERADOR'],
  buscarAtestado:async()=>{eventos.push('atestado');return atestado;},
  auditar:async()=>{eventos.push('auditoria');if(auditoriaFalha)throw Error('auditoria indisponivel');},
  consultarNeon:async(sql,parametros)=>{
   eventos.push('rpc');assert.match(sql,/registrar_decisao_identidade_privada/);
   assert.deepEqual(parametros,[protocolo,referenciaOperador,registroId,true,true,'aprovado']);
   return [{id:900007}];
  },relogio:()=>agora
 });
 return {registrar,eventos};
}
test('fluxo integral sintético valida UID, atestado, auditoria e RPC',async()=>{
 const {registrar,eventos}=montar();
 assert.deepEqual(await registrar(args),{registroId,id:900007});
 assert.deepEqual(eventos,['auth','atestado','auditoria','rpc']);
});
test('UID divergente impede atestado e escrita',async()=>{
 const {registrar,eventos}=montar({uidSessao:'22222222-2222-4222-8222-222222222222'});
 await assert.rejects(()=>registrar(args),/não autorizado/);
 assert.deepEqual(eventos,['auth']);
});
test('identidade negada impede auditoria e escrita',async()=>{
 const {registrar,eventos}=montar({identidadeConfirmada:false});
 await assert.rejects(()=>registrar(args),/não confirmada/);
 assert.deepEqual(eventos,['auth','atestado']);
});
test('auditoria indisponível impede escrita',async()=>{
 const {registrar,eventos}=montar({auditoriaFalha:true});
 await assert.rejects(()=>registrar(args),/auditoria indisponivel/);
 assert.deepEqual(eventos,['auth','atestado','auditoria']);
});
