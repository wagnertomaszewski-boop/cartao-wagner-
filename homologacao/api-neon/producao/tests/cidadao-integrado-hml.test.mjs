import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import test from 'node:test';
import {criarCandidataHml} from '../homologacao-runtime.mjs';

test('serve o acompanhamento original, usa a API isolada e exige a chave individual',async()=>{
 const origem='https://mandato-neon-homologacao.onrender.com';
 const h=criarCandidataHml({origem,verificarMfa:()=>{throw Error('MFA');}});
 const s=createServer((req,res)=>void h(req,res));
 await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+s.address().port+'/hml/candidata/';
 const post=async(rota,d)=>fetch(base+'api/v1/'+rota,{method:'POST',headers:{origin:origem,'content-type':'application/json'},body:JSON.stringify(d)});
 try{
  const htmlR=await fetch(base+'app/acompanhar.html');assert.equal(htmlR.status,200);
  const html=await htmlR.text();
  assert.match(html,/id="chavePrivada"/);
  assert.doesNotMatch(html,/consulta_publica_protocolo|https:\/\/[^"]*supabase\.co/);
  const modulo=await (await fetch(base+'app/mandato-seguro/cidadao.mjs')).text();
  assert.match(modulo,/cliente-cidadao-hml\.mjs/);
  assert.doesNotMatch(modulo,/configuracao-publica\.json/);
  for(const nome of ['telefone.mjs','cliente-cidadao-hml.mjs','fotos.mjs'])assert.equal((await fetch(base+'app/v2/seguranca/'+nome)).status,200);
  const cadastro=await post('solicitacoes/cadastrar',{operacaoId:'00000000-0000-4000-8000-000000000076',p_nome:'Nome fictício',
   p_whatsapp:'51000000000',p_localidade:'Local de teste',p_assunto:'Consulta integrada',p_descricao:'Teste'});
  assert.equal(cadastro.status,200);
  const {protocolo,chaveInicial}=await cadastro.json();
  for(const credencial of [{protocolo},{protocolo,chave:'A'.repeat(43)}])
   assert.deepEqual(await (await post('solicitacoes/consultar',credencial)).json(),{encontrado:false});
  const certo=await (await post('solicitacoes/consultar',{protocolo,chave:chaveInicial})).json();
  assert.equal(certo.assunto,'Consulta integrada');
  for(const campo of ['nome','whatsapp','latitude','longitude','anotacao_interna'])assert.equal(Object.hasOwn(certo,campo),false);
 }finally{await new Promise(resolve=>s.close(resolve));await h.fechar();}
});
