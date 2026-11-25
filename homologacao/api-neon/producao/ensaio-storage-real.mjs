import {randomUUID} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {fileURLToPath} from 'node:url';
import {PROJETO} from './configuracao.mjs';
import {criarStoragePrivado} from './storage.mjs';

export async function ensaiarStorage({chavesSecretas,buscar=fetch,id=randomUUID()}){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id))throw Error('Identificador de ensaio inválido.');
 const bucket='anexos-solicitacoes';
 const caminho='ensaios-mandato/'+id+'.png';
 const sintetico=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1ioAAAAASUVORK5CYII=','base64');
 let key;
 const storage=criarStoragePrivado({chavesSecretas,buscar:(url,opt)=>{
  key=opt.headers.apikey;
  return buscar(url,opt);
 }});
 try{
  await storage.enviar(caminho,sintetico,'image/png');
 }catch{
  throw Error('Upload sintético indisponível. Confira pela faixa de ensaio antes de repetir: '+caminho);
 }
 try{
  const dados=await storage.baixar(caminho,bucket);
  if(!dados.equals(sintetico))throw Error('Download sintético retornou bytes diferentes.');
 }finally{
  try{
   const resposta=await buscar('https://'+PROJETO+'.supabase.co/storage/v1/object/'+bucket,{
    method:'DELETE',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({prefixes:[caminho]}),
    redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)
   });
   if(!resposta.ok)throw Error();
   const removidos=await resposta.json();
   if(!Array.isArray(removidos)||!removidos.some(x=>x.name===caminho))throw Error();
  }catch{throw Error('Limpeza do objeto sintético pendente: '+caminho);}
 }
 return {upload:true,download:true,limpeza:true};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 if(process.env.MANDATO_ENSAIO_STORAGE_AUTORIZADO!=='sim')throw Error('Execução de escrita no Storage ainda não autorizada.');
 try{console.log(await ensaiarStorage({chavesSecretas:process.env.SUPABASE_SECRET_KEYS}));}
 catch(e){console.error(e.message);process.exitCode=1;}
}
