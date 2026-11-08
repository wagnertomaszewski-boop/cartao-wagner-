import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {criarFonteEvidenciaAssinada} from './fonte-evidencia-assinada.mjs';
const {publicKey,privateKey}=generateKeyPairSync('ed25519');
const protocolo='LEGADO-EMISSAO-TESTE-900006',referenciaOperador='OP-TESTE-900006',registroId='REG-TESTE-900006',agora=1794100000000;
const args={protocolo,referenciaOperador,registroId};
function atestar(alteracoes={}){
 const d={protocolo,operador:referenciaOperador,registroId,conferenteId:'REV-SEGUNDO-OPERADOR',
  verificada:true,identidadeConfirmada:true,verificadaEmMs:agora-1000,...alteracoes};
 const mensagem=Buffer.from(JSON.stringify(['mandato-evidencia-v1',d.protocolo,d.operador,d.registroId,d.conferenteId,d.verificada,d.identidadeConfirmada,d.verificadaEmMs]));
 return {dados:d,assinatura:sign(null,mensagem,privateKey).toString('base64url')};
}
test('aceita atestado independente válido e recente',async()=>{
 const fonte=criarFonteEvidenciaAssinada({chavePublicaConferente:publicKey,buscarAtestado:async()=>atestar(),relogio:()=>agora});
 assert.equal((await fonte(args)).identidadeConfirmada,true);
});
test('rejeita atestado adulterado, expirado e de outro protocolo',async()=>{
 for(const documento of [
  {...atestar(),dados:{...atestar().dados,identidadeConfirmada:false}},
  atestar({verificadaEmMs:agora-16*60*1000}),
  atestar({protocolo:'OUTRO'})
 ]){
  const fonte=criarFonteEvidenciaAssinada({chavePublicaConferente:publicKey,buscarAtestado:async()=>documento,relogio:()=>agora});
  assert.equal(await fonte(args),null);
 }
});
test('não aceita assinatura de chave não confiável nem fonte indisponível',async()=>{
 const outra=generateKeyPairSync('ed25519').publicKey;
 const fonte=criarFonteEvidenciaAssinada({chavePublicaConferente:outra,buscarAtestado:async()=>atestar(),relogio:()=>agora});
 assert.equal(await fonte(args),null);
 const indisponivel=criarFonteEvidenciaAssinada({chavePublicaConferente:publicKey,buscarAtestado:async()=>{throw Error('offline');}});
 assert.equal(await indisponivel(args),null);
});
