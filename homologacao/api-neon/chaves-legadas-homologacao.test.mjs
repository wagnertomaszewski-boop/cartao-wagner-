import test from 'node:test';
import assert from 'node:assert/strict';
import {prepararChaveLegada,verificarChaveLegada} from './chaves-legadas-homologacao.mjs';
test('identidade não verificada impede emissão',()=>{
 assert.throws(()=>prepararChaveLegada({protocolo:'FICTICIO-001'}),/identidade/);
 assert.throws(()=>prepararChaveLegada({protocolo:'FICTICIO-001',identidadeVerificada:'true'}),/identidade/);
});
test('chave aleatória de 256 bits e hash são distintos e verificáveis',()=>{
 const a=prepararChaveLegada({protocolo:' FICTICIO-001 ',identidadeVerificada:true});
 const b=prepararChaveLegada({protocolo:'FICTICIO-001',identidadeVerificada:true});
 assert.equal(a.protocolo,'FICTICIO-001');
 assert.match(a.chave,/^[a-f0-9]{64}$/);
 assert.match(a.hash,/^[a-f0-9]{64}$/);
 assert.notEqual(a.chave,a.hash);
 assert.notEqual(a.chave,b.chave);
 assert.equal(verificarChaveLegada(a),true);
 assert.equal(verificarChaveLegada({chave:b.chave,hash:a.hash}),false);
 assert.equal(verificarChaveLegada({chave:'invalida',hash:a.hash}),false);
});
test('gerador fraco ou incorreto é rejeitado',()=>{
 assert.throws(()=>prepararChaveLegada({protocolo:'FICTICIO-001',identidadeVerificada:true,gerarBytes:()=>Buffer.alloc(8)}),/Gerador/);
});
