import test from 'node:test';
import assert from 'node:assert/strict';
import { criarRepositorioConsulta } from './repositorio-consulta-pg.mjs';
import { criarConsultaProtegida } from './consulta-protegida.mjs';
import { criarChave, verificadorHmac } from './segredos-privados.mjs';

const segredo='segredo-ficticio-de-testes-com-mais-de-trinta-dois-bytes';
const chave=criarChave();
test('repositório usa parâmetros e não retorna dados pessoais',async()=>{
 const consultas=[];
 const pool={query:async(sql,args)=>{consultas.push({sql,args});return {rows:[{solicitacao_id:9,segredo_verificador:verificadorHmac('key',chave,segredo),revogada_em:null}]};}};
 const repo=criarRepositorioConsulta({pool,segredoServidor:segredo});
 const registro=await repo.buscarPorProtocolo('2026-TESTE');
 assert.equal(registro.solicitacao_id,9);
 assert.deepEqual(consultas[0].args,['2026-TESTE']);
 assert.match(consultas[0].sql,/s\.protocolo=\$1/);
 assert.equal(Object.hasOwn(registro,'nome'),false);
});
test('consulta integrada autoriza apenas chave correta e usa limite persistente',async()=>{
 const chamadas=[];
 const pool={query:async(sql,args)=>{
  chamadas.push({sql,args});
  if(sql.includes('registrar_tentativa_consulta')) return {rows:[{permitido:true}]};
  return {rows:[{solicitacao_id:9,segredo_verificador:verificadorHmac('key',chave,segredo),revogada_em:null}]};
 }};
 const repo=criarRepositorioConsulta({pool,segredoServidor:segredo});
 const consultar=criarConsultaProtegida({...repo,segredoServidor:segredo});
 assert.deepEqual(await consultar({protocolo:'2026-TESTE',chave,origem:'ip-do-proxy'}),{autorizado:true,solicitacaoId:9});
 assert.equal(chamadas.length,2);
 assert.equal(Buffer.isBuffer(chamadas[0].args[0]),true);
 assert.equal(chamadas[0].args[0].length,32);
});
test('sem origem confiável ou limitador indisponível não lê solicitação',async()=>{
 let leituras=0;
 const pool={query:async(sql)=>{if(sql.includes('registrar_tentativa_consulta'))throw Error('banco indisponivel');leituras++;return {rows:[]};}};
 const repo=criarRepositorioConsulta({pool,segredoServidor:segredo});
 const consultar=criarConsultaProtegida({...repo,segredoServidor:segredo});
 assert.deepEqual(await consultar({protocolo:'2026-TESTE',chave}),{autorizado:false});
 assert.deepEqual(await consultar({protocolo:'2026-TESTE',chave,origem:'ip-do-proxy'}),{autorizado:false});
 assert.equal(leituras,0);
});
