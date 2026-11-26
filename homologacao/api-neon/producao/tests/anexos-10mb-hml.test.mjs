import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import test from 'node:test';
import {criarCandidataHml} from '../homologacao-runtime.mjs';
import {LIMITE_ARQUIVO_BYTES,LIMITE_CORPO_ANEXO_BYTES} from '../../validacao-arquivo-hml.mjs';
import {compactarFoto,validarSelecaoArquivos,enviarArquivosPendentes} from '../../telas/v2/seguranca/fotos-solicitacao-hml.mjs';

test('compacta fotos, conserva PDF e preserva a fila quando um envio falha',async()=>{
 const jpeg=new File([new Uint8Array(600*1024)],'foto.jpg',{type:'image/jpeg'});
 const pdf=new File([new Uint8Array(8)],'arquivo.pdf',{type:'application/pdf'});
 const originais=[globalThis.createImageBitmap,globalThis.document];
 let fechou=false;
 globalThis.createImageBitmap=async()=>({width:2400,height:1200,close(){fechou=true;}});
 globalThis.document={createElement:()=>({
  getContext:()=>({drawImage(){}}),
  toBlob(fn,tipo){assert.equal(this.width,1920);assert.equal(this.height,960);fn(new Blob(['foto'],{type:tipo}));}
 })};
 try{
  assert.equal((await compactarFoto(jpeg)).size,4);assert.equal(fechou,true);
  assert.equal(await compactarFoto(pdf),pdf);
  assert.throws(()=>validarSelecaoArquivos(Array(21).fill(jpeg)),/20 arquivos/);
  const fila=[jpeg,pdf],confirmados=[];
  await assert.rejects(enviarArquivosPendentes(fila,async f=>{if(f===pdf)throw Error('Falha de teste');},nome=>confirmados.push(nome)),/Falha/);
  assert.deepEqual(fila,[pdf]);assert.deepEqual(confirmados,['foto.jpg']);
 }finally{[globalThis.createImageBitmap,globalThis.document]=originais;}
});

test('API de homologação grava, protege e devolve 10 MB; recusa excedente e 21º arquivo',async()=>{
 const origem='https://mandato-neon-homologacao.onrender.com';
 const h=criarCandidataHml({origem,verificarMfa:()=>{throw Error('MFA');}});
 const s=createServer((req,res)=>void h(req,res));
 await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));
 const post=async(rota,dados)=>{
  const r=await fetch('http://127.0.0.1:'+s.address().port+'/hml/candidata/api/v1/'+rota,{
   method:'POST',headers:{origin:origem,'content-type':'application/json'},body:JSON.stringify(dados)});
  return [r.status,await r.json()];
 };
 try{
  const [status,registro]=await post('solicitacoes/cadastrar',{
   operacaoId:'00000000-0000-4000-8000-000000000001',p_nome:'Teste',p_whatsapp:'51000000000',
   p_localidade:'Teste',p_assunto:'Teste',p_descricao:'Teste'});
  assert.equal(status,200);
  const par={protocolo:registro.protocolo,chave:registro.chaveInicial};
  const pdf=Buffer.alloc(LIMITE_ARQUIVO_BYTES,32);pdf.write('%PDF-1.7');
  const base64=pdf.toString('base64');
  const d={...par,nome:'limite.pdf',mime:'application/pdf',base64};
  assert.ok(Buffer.byteLength(JSON.stringify(d))<LIMITE_CORPO_ANEXO_BYTES);
  const [ok,a]=await post('arquivos/anexar',d);assert.equal(ok,200);
  assert.equal((await post('arquivos/baixar',{...par,chave:'A'.repeat(43),arquivoId:a.id}))[0],403);
  const [baixou,arquivo]=await post('arquivos/baixar',{...par,arquivoId:a.id});
  assert.equal(baixou,200);assert.equal(arquivo.base64===base64,true);
  const excedente=Buffer.concat([pdf,Buffer.from(' ')]).toString('base64');
  assert.equal((await post('arquivos/anexar',{...d,base64:excedente}))[0],413);
  for(let i=1;i<20;i++){
   const arquivo={...d,nome:i+'.pdf',base64:Buffer.from('%PDF-test-'+i).toString('base64')};
   assert.equal((await post('arquivos/anexar',arquivo))[0],200);
  }
  assert.equal((await post('arquivos/anexar',{...d,base64:Buffer.from('%PDF-extra').toString('base64')}))[0],429);
 }finally{await new Promise(resolve=>s.close(resolve));await h.fechar();}
});
