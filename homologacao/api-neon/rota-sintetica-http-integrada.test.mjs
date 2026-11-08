import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {criarServidor} from './server.mjs';
import {criarRegistroSinteticoAssinado900007} from './registro-sintetico-assinado-900007.mjs';

const uid='11111111-1111-4111-8111-111111111111';
const protocolo='LEGADO-EMISSAO-TESTE-900007';
const referenciaOperador='OP-TESTE-900007';
const registroId='REG-TESTE-900007';
const token='token-ficticio-de-homologacao-comprido';
const corpo={protocolo,referenciaOperador,registroId,identidadeVerificada:true,evidenciaConferida:true};

async function executar({uidSessao=uid,identidadeConfirmada=true,assinaturaCorrompida=false,adminAutorizado=true,auditoriaFalha=false}={}){
 const eventos=[];
 const {publicKey,privateKey}=generateKeyPairSync('ed25519');
 const agora=Date.now();
 const dados={protocolo,operador:referenciaOperador,registroId,conferenteId:'REV-TESTE-900007',verificada:true,identidadeConfirmada,verificadaEmMs:agora-1000};
 const mensagem=Buffer.from(JSON.stringify(['mandato-evidencia-v1',dados.protocolo,dados.operador,dados.registroId,dados.conferenteId,dados.verificada,dados.identidadeConfirmada,dados.verificadaEmMs]));
 const assinatura=sign(null,mensagem,privateKey).toString('base64url');
 const handler=criarRegistroSinteticoAssinado900007({
  supabaseUrl:'https://pmmsdjozyyxkbuqlkfpb.supabase.co',
  supabasePublishableKey:'sb_publishable_chave_ficticia_homologacao',
  operadoresPermitidos:{[uid]:referenciaOperador},
  buscarAuth:async()=>{eventos.push('auth');return {ok:true,json:async()=>({id:uidSessao,aud:'authenticated',is_anonymous:false})};},
  chavePublicaConferente:publicKey,
  conferentesPermitidos:['REV-TESTE-900007'],
  buscarAtestado:async()=>{eventos.push('atestado');return {dados,assinatura:assinaturaCorrompida?((assinatura[0]==='A'?'B':'A')+assinatura.slice(1)):assinatura};},
  auditar:async()=>{eventos.push('auditoria');if(auditoriaFalha)throw Error('falha de auditoria');},
  consultarNeon:async(sql,params)=>{eventos.push('rpc');assert.match(sql,/registrar_decisao_sintetica_900007/);assert.deepEqual(params,[protocolo,referenciaOperador,registroId]);return [{id:900007}];},
  relogio:()=>agora
 });
 const servidor=criarServidor({verificarAdmin:async()=>adminAutorizado,registrarDecisaoSintetica:handler});
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 try{
  const resposta=await fetch('http://127.0.0.1:'+servidor.address().port+'/api/homologacao/decisao-sintetica-900007',{
   method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(corpo)
  });
  return {status:resposta.status,resultado:await resposta.json(),eventos};
 }finally{await new Promise(resolve=>servidor.close(resolve));}
}
test('HTTP integrado com UID, Ed25519, auditoria e RPC sintética',async()=>{
 const r=await executar();
 assert.equal(r.status,200);
 assert.deepEqual(r.eventos,['auth','atestado','auditoria','rpc']);
 assert.equal(r.resultado.id,900007);
});
test('HTTP nega UID divergente sem consultar atestado nem gravar',async()=>{
 const r=await executar({uidSessao:'22222222-2222-4222-8222-222222222222'});
 assert.equal(r.status,503);assert.deepEqual(r.eventos,['auth']);
});
test('HTTP nega identidade não confirmada sem gravar',async()=>{
 const r=await executar({identidadeConfirmada:false});
 assert.equal(r.status,503);assert.deepEqual(r.eventos,['auth','atestado']);
});
test('HTTP nega assinatura inválida sem gravar',async()=>{
 const r=await executar({assinaturaCorrompida:true});
 assert.equal(r.status,503);assert.deepEqual(r.eventos,['auth','atestado']);
});
test('HTTP não grava se auditoria falhar',async()=>{
 const r=await executar({auditoriaFalha:true});
 assert.equal(r.status,503);assert.deepEqual(r.eventos,['auth','atestado','auditoria']);
});
test('HTTP nega administrador não autorizado antes da autenticação de operador',async()=>{
 const r=await executar({adminAutorizado:false});
 assert.equal(r.status,403);assert.deepEqual(r.eventos,[]);
});
