import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {criarEmissorLegadoPostgres} from './emissor-legado-postgres.mjs';
test('emissão interna persiste hash e auditoria no mesmo commit e entrega chave consultável',async()=>{
 const comandos=[];let gravado,acesso,auditoria,liberado=false;
 const pool={connect:async()=>({
  query:async(sql,parametros=[])=>{
   comandos.push(sql);
   if(sql.includes('SELECT 1 FROM mandato_testes.chaves_legadas'))return {rows:gravado?[{existe:1}]:[]};
   if(sql.includes('SELECT solicitacao_id FROM mandato_testes.acessos_protocolo'))return {rows:acesso?[{solicitacao_id:900004}]:[]};
   if(sql.includes('SELECT id FROM mandato_testes.solicitacoes'))return {rows:[{id:900004}]};
   if(sql.includes('INSERT INTO mandato_testes.chaves_legadas'))gravado={protocolo:parametros[0],hash:parametros[1]};
   if(sql.includes('INSERT INTO mandato_testes.acessos_protocolo'))acesso={id:parametros[0],protocolo:parametros[1],hash:parametros[2]};
   if(sql.includes('INSERT INTO mandato_testes.auditoria_chaves_legadas'))auditoria={protocolo:parametros[0],id:parametros[1],evento:parametros[2]};
   return {rows:[]};
  },release:()=>{liberado=true}
 })};
 const emissor=criarEmissorLegadoPostgres({pool,verificarIdentidade:async()=>({solicitacaoId:900004}),auditarTentativa:async()=>{}});
 const emitido=await emissor.emitir({protocolo:'LEGADO-FICTICIO-900004',comprovante:'VERIFICADO-APENAS-TESTE'});
 assert.match(emitido.chave,/^[a-f0-9]{64}$/);
 assert.equal(gravado.hash,createHash('sha256').update(emitido.chave).digest('hex'));
 assert.deepEqual(acesso,{id:900004,protocolo:emitido.protocolo,hash:gravado.hash});
 assert.deepEqual(auditoria,{protocolo:emitido.protocolo,id:900004,evento:'chave_legada_emitida'});
 assert.equal(comandos[0],'BEGIN');
 assert.equal(comandos.at(-1),'COMMIT');
 assert.equal(liberado,true);
});
