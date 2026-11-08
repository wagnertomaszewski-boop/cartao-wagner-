import test from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';
import {criarOperacoesNeon} from './operacoes-neon.mjs';
const protocolo='LEGADO-TESTE-900003';
const chave='CHAVE-FICTICIA-HOMOLOGACAO-900003-VALIDA-2026';
async function requisitar(base,dados){
 const resposta=await fetch(base+'/api/solicitacoes/consultar',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(dados)});
 return {status:resposta.status,corpo:await resposta.json()};
}
test('HTTP legado permite chave correta e bloqueia chave errada e outro protocolo',async()=>{
 const chamadas=[];
 const executarCidadao=async(sql,args)=>{
  chamadas.push({sql,args});
  const autorizado=args[0]===protocolo && args[1]===chave;
  if(!autorizado)return [];
  if(sql.includes('consulta_segura('))return [{assunto:'Registro fictício',status:'recebido'}];
  return [];
 };
 const operacoes=criarOperacoesNeon({executarCidadao,executarAdmin:async()=>[]});
 const servidor=criarServidor({operacoes});
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+servidor.address().port;
  const valido=await requisitar(base,{protocolo,chave});
  assert.equal(valido.status,200);
  assert.deepEqual(valido.corpo.resultado,[{assunto:'Registro fictício',status:'recebido'}]);
  const incorreto=await requisitar(base,{protocolo,chave:'CHAVE-FICTICIA-HOMOLOGACAO-900003-ERRADA-2026'});
  assert.deepEqual(incorreto.corpo.resultado,[]);
  const outro=await requisitar(base,{protocolo:'LEGADO-TESTE-900002',chave});
  assert.deepEqual(outro.corpo.resultado,[]);
  assert.equal(chamadas.length,6);
  assert.ok(chamadas.every(({sql,args})=>sql.includes('mandato_testes.')&&args.length===2));
 }finally{await new Promise((resolve,reject)=>servidor.close(err=>err?reject(err):resolve()));}
});
