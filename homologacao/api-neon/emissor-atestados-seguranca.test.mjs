import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {criarEmissorAtestados} from './emissor-atestados-privado.mjs';
import {criarVerificadorAtestadoIdentidade} from './verificar-atestado-identidade.mjs';

const par=generateKeyPairSync('ed25519');
const privada=par.privateKey.export({format:'pem',type:'pkcs8'});
const publica=par.publicKey.export({format:'pem',type:'spki'});
const operadorId='123e4567-e89b-42d3-a456-426614174000';
const agora=()=>1731000000000;
const pedido={solicitacaoId:'123',operadorId,acao:'emitir',evidencia:'confirmacao-independente-valida'};

test('emissor recusa ausência de verificador independente e autorização',()=>{
 assert.throws(()=>criarEmissorAtestados({chavePrivadaPem:privada,autorizarOperador:async()=>true}));
 assert.throws(()=>criarEmissorAtestados({chavePrivadaPem:privada,confirmarIdentidadeIndependente:async()=>true}));
});

test('emissor recusa operador ou identidade não confirmada',async()=>{
 const semOperador=criarEmissorAtestados({chavePrivadaPem:privada,confirmarIdentidadeIndependente:async()=>true,autorizarOperador:async()=>false,agora});
 await assert.rejects(semOperador(pedido),/Operador não autorizado/);
 const semIdentidade=criarEmissorAtestados({chavePrivadaPem:privada,confirmarIdentidadeIndependente:async()=>false,autorizarOperador:async()=>true,agora});
 await assert.rejects(semIdentidade(pedido),/Identidade não comprovada/);
});

test('atestado assinado verifica ação e validade e rejeita reutilização de nonce',async()=>{
 const emitir=criarEmissorAtestados({chavePrivadaPem:privada,confirmarIdentidadeIndependente:async()=>true,autorizarOperador:async()=>true,agora});
 const atestado=await emitir(pedido);
 const usados=new Set();
 const confirmar=criarVerificadorAtestadoIdentidade({chavePublicaPem:publica,agora,consumirNonce:async({nonce})=>{if(usados.has(nonce))return false;usados.add(nonce);return true;}});
 assert.equal(await confirmar({solicitacaoId:'123',atestado,contexto:{acao:'revogar'}}),false);
 assert.equal(await confirmar({solicitacaoId:'124',atestado,contexto:{acao:'emitir'}}),false);
 assert.equal(await confirmar({solicitacaoId:'123',atestado,contexto:{acao:'emitir'}}),true);
 assert.equal(await confirmar({solicitacaoId:'123',atestado,contexto:{acao:'emitir'}}),false);
 const expirado=criarVerificadorAtestadoIdentidade({chavePublicaPem:publica,agora:()=>agora()+121000,consumirNonce:async()=>true});
 assert.equal(await expirado({solicitacaoId:'123',atestado,contexto:{acao:'emitir'}}),false);
});
