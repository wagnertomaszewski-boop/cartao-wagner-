import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {criarRegistroSinteticoAssinado900007} from './registro-sintetico-assinado-900007.mjs';
const {publicKey,privateKey}=generateKeyPairSync('ed25519');
const uid='11111111-1111-4111-8111-111111111111';
const args={protocolo:'LEGADO-EMISSAO-TESTE-900007',referenciaOperador:'OP-TESTE-900007',registroId:'REG-TESTE-900007',tokenOperador:'token-de-operador-ficticio-valido'};
const agora=1794100000000;
function montar({identidadeConfirmada=true}={}){
 const eventos=[];
 const d={protocolo:args.protocolo,operador:args.referenciaOperador,registroId:args.registroId,conferenteId:'REV-CONFERENTE-900007',verificada:true,identidadeConfirmada,verificadaEmMs:agora-1000};
 const mensagem=Buffer.from(JSON.stringify(['mandato-evidencia-v1',d.protocolo,d.operador,d.registroId,d.conferenteId,d.verificada,d.identidadeConfirmada,d.verificadaEmMs]));
 const registrar=criarRegistroSinteticoAssinado900007({
  supabaseUrl:'https://pmmsdjozyyxkbuqlkfpb.supabase.co',
  supabasePublishableKey:'sb_publishable_chave_ficticia_homologacao',
  operadoresPermitidos:{[uid]:args.referenciaOperador},
  buscarAuth:async()=>{eventos.push('auth');return {ok:true,json:async()=>({id:uid,aud:'authenticated',is_anonymous:false})};},
  chavePublicaConferente:publicKey,conferentesPermitidos:['REV-CONFERENTE-900007'],
  buscarAtestado:async()=>{eventos.push('atestado');return {dados:d,assinatura:sign(null,mensagem,privateKey).toString('base64url')};},
  auditar:async()=>{eventos.push('auditoria');},
  consultarNeon:async(sql,parametros)=>{eventos.push('rpc');assert.match(sql,/registrar_decisao_sintetica_900007/);assert.deepEqual(parametros,[args.protocolo,args.referenciaOperador,args.registroId]);return [{id:'1'}];},
  relogio:()=>agora
 });
 return {registrar,eventos};
}
test('fluxo sintético integral assinado chega à RPC restrita',async()=>{
 const {registrar,eventos}=montar();
 assert.deepEqual(await registrar(args),{registroId:args.registroId,id:'1'});
 assert.deepEqual(eventos,['auth','atestado','auditoria','rpc']);
});
test('atestado de identidade negada bloqueia RPC',async()=>{
 const {registrar,eventos}=montar({identidadeConfirmada:false});
 await assert.rejects(()=>registrar(args),/não confirmada/);
 assert.deepEqual(eventos,['auth','atestado']);
});
