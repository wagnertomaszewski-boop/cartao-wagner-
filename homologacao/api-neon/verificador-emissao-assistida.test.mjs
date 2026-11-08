import test from 'node:test';
import assert from 'node:assert/strict';
import {criarVerificadorEmissaoAssistida} from './verificador-emissao-assistida.mjs';
test('aprovacao manual decidida e vinculo conferido liberam emissor interno',async()=>{
 const verificar=criarVerificadorEmissaoAssistida({
  validarComprovante:async()=>true,
  buscarVinculo:async()=>({protocolo:'LEGADO-TESTE',solicitacaoId:900004}),
  consultarAprovacao:async(sql,args)=>{
   assert.match(sql,/status='aprovado'/);
   assert.match(sql,/decidido_em >= now\(\) - interval '24 hours'/);
   assert.deepEqual(args,[900004]);
   return [{id:77}];
  }
 });
 assert.deepEqual(await verificar({protocolo:'LEGADO-TESTE',comprovante:'validado'}),{solicitacaoId:900004});
});
test('sem aprovacao manual nenhuma chave pode ser autorizada',async()=>{
 const verificar=criarVerificadorEmissaoAssistida({
  validarComprovante:async()=>true,
  buscarVinculo:async()=>({protocolo:'LEGADO-TESTE',solicitacaoId:900004}),
  consultarAprovacao:async()=>[]
 });
 assert.equal(await verificar({protocolo:'LEGADO-TESTE',comprovante:'validado'}),false);
});
test('comprovante invalido impede consultar aprovacao',async()=>{
 let consultas=0;
 const verificar=criarVerificadorEmissaoAssistida({
  validarComprovante:async()=>false,
  buscarVinculo:async()=>({protocolo:'LEGADO-TESTE',solicitacaoId:900004}),
  consultarAprovacao:async()=>{consultas++;return [{id:77}]}
 });
 assert.equal(await verificar({protocolo:'LEGADO-TESTE',comprovante:'invalido'}),false);
 assert.equal(consultas,0);
});
