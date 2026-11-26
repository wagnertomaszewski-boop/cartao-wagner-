import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import test from 'node:test';
import {criarCandidataHml} from '../homologacao-runtime.mjs';

test('Painel exige MFA e distingue GPS de marcação manual; foto fica vinculada ao protocolo',async()=>{
 const origem='https://mandato-neon-homologacao.onrender.com';
 const handler=criarCandidataHml({origem,verificarMfa:req=>{
  if(req.headers.cookie!=='sessao=ficticia')throw Error('MFA exigido');
  return {usuarioId:'00000000-0000-4000-8000-000000000003'};
 }});
 const servidor=createServer((req,res)=>void handler(req,res));
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 const api=async(rota,dados,cookie)=>{
  const r=await fetch('http://127.0.0.1:'+servidor.address().port+'/hml/candidata/api/v1/'+rota,{
   method:'POST',headers:{origin:origem,'content-type':'application/json',...(cookie?{cookie}:{})},
   body:JSON.stringify(dados)
  });
  return {status:r.status,body:await r.json()};
 };
 try{
  const criar=async(origem,id)=>{
   const r=await api('solicitacoes/cadastrar',{
    operacaoId:'00000000-0000-4000-8000-00000000000'+id,p_nome:'Teste',p_whatsapp:'51000000000',
    p_localidade:'Teste',p_assunto:'Teste',p_descricao:'Teste',
    latitude:-31,longitude:-52,localizacaoOrigem:origem,localizacaoAutorizada:true
   });
   assert.equal(r.status,200);return r.body;
  };
  const gps=await criar('gps',1),manual=await criar('mapa',2);
  const rota='admin/solicitacoes/localizacao',sessao='sessao=ficticia';
  assert.equal((await api(rota,{protocolo:gps.protocolo})).status,403);
  assert.deepEqual((await api(rota,{protocolo:gps.protocolo},sessao)).body.ponto,{latitude:-31,longitude:-52,origem:'gps'});
  assert.equal((await api(rota,{protocolo:manual.protocolo},sessao)).body.ponto.origem,'mapa');
  const par={protocolo:gps.protocolo,chave:gps.chaveInicial};
  const base64='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1ioAAAAASUVORK5CYII=';
  const foto=await api('arquivos/anexar',{...par,nome:'homologacao.png',mime:'image/png',base64});
  assert.equal(foto.status,200);
  const anexos=(await api(rota,{protocolo:gps.protocolo},sessao)).body.anexos;
  assert.deepEqual(anexos,[{id:foto.body.id,nome:'homologacao.png',mime:'image/png'}]);
  const download='admin/solicitacoes/baixar-anexo';
  assert.equal((await api(download,{protocolo:gps.protocolo,arquivoId:foto.body.id})).status,403);
  assert.equal((await api(download,{protocolo:manual.protocolo,arquivoId:foto.body.id},sessao)).status,404);
  assert.equal((await api(download,{protocolo:gps.protocolo,arquivoId:foto.body.id},sessao)).body.base64,base64);
  const consulta=await api('solicitacoes/consultar',par);
  assert.equal(consulta.body.anexos[0].id,foto.body.id);
  assert.equal((await api('arquivos/baixar',{...par,arquivoId:foto.body.id})).body.base64,base64);
 }finally{await new Promise(resolve=>servidor.close(resolve));await handler.fechar();}
});
