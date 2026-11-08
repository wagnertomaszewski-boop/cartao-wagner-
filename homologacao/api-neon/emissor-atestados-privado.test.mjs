import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {criarEmissorAtestados} from './emissor-atestados-privado.mjs';
import {criarVerificadorAtestadoIdentidade} from './verificar-atestado-identidade.mjs';
const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const pem=privateKey.export({type:'pkcs8',format:'pem'});
const admin='123e4567-e89b-42d3-a456-426614174000';
const args={solicitacaoId:'900020',operadorId:admin,acao:'emitir',evidencia:'evidencia-confirmada-externamente'};
test('emissor e verificador interoperam e atestado não pode ser reutilizado',async()=>{
 const emitir=criarEmissorAtestados({chavePrivadaPem:pem,autorizarOperador:async()=>true,confirmarIdentidadeIndependente:async()=>({confirmacaoWhatsapp:true,conferenciaPessoal:true,reatenticacaoRecente:true,justificativa:'Identidade conferida no teste controlado.'}),agora:()=>1762600000000});
 const usado=new Set();
 const verificar=criarVerificadorAtestadoIdentidade({chavePublicaPem:publicKey.export({type:'spki',format:'pem'}),agora:()=>1762600001000,consumirNonce:async({nonce})=>{if(usado.has(nonce))return false;usado.add(nonce);return true;}});
 const atestado=await emitir(args);
 assert.equal(await verificar({solicitacaoId:'900020',atestado,contexto:{acao:'emitir'}}),true);
 assert.equal(await verificar({solicitacaoId:'900020',atestado,contexto:{acao:'emitir'}}),false);
});
test('emissor recusa identidade não comprovada e operador não autorizado',async()=>{
 const negarIdentidade=criarEmissorAtestados({chavePrivadaPem:pem,autorizarOperador:async()=>true,confirmarIdentidadeIndependente:async()=>false});
 await assert.rejects(negarIdentidade(args),/Identidade não comprovada/);
 const negarOperador=criarEmissorAtestados({chavePrivadaPem:pem,autorizarOperador:async()=>false,confirmarIdentidadeIndependente:async()=>true});
 await assert.rejects(negarOperador(args),/Operador não autorizado/);
});
