import {Buffer} from 'node:buffer';
import {LIMITE_ARQUIVO_BYTES} from '../validacao-arquivo-hml.mjs';
import {PROJETO} from './configuracao.mjs';
import {caminhoLegado} from './anexos-legados.mjs';
// Credencial exclusivamente no servidor. Arquivos retornam no corpo, sem URL pública.
export function criarStoragePrivado({chavesSecretas,buscar=fetch}){
 let chaves;
 try{chaves=JSON.parse(chavesSecretas);}catch{
  throw Error('SUPABASE_SECRET_KEYS ausente ou inválido.');
 }
 const credencial=chaves?.mandato_api_privada;
 if(typeof credencial!=='string'||!/^sb_secret_[A-Za-z0-9_-]{20,}$/.test(credencial))
  throw Error('Chave de Storage mandato_api_privada ausente ou inválida.');
 function url(caminho,bucket='anexos-solicitacoes',prefixo=''){const validado=caminhoLegado(caminho,bucket);if(!validado||/^https?:/.test(caminho))throw Error('Caminho privado inválido.');return `https://${PROJETO}.supabase.co/storage/v1/object/`+prefixo+bucket+'/'+caminho.split('/').map(encodeURIComponent).join('/');}
 const headers={apikey:credencial};
 return {
 async enviar(caminho,bytes,mime){if(bytes.byteLength>LIMITE_ARQUIVO_BYTES)throw Object.assign(Error('Arquivo excede 10 MB.'),{status:413});const r=await buscar(url(caminho),{method:'POST',headers:{...headers,'Content-Type':mime,'x-upsert':'false'},body:bytes,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error('Upload privado indisponível.');},
 async baixar(caminho,bucket){const r=await buscar(url(caminho,bucket,'authenticated/'),{headers,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Arquivo privado indisponível.');if(Number(r.headers.get('content-length'))>20971520)throw Error('Arquivo excede o limite.');const reader=r.body.getReader(),partes=[];let n=0;while(true){const v=await reader.read();if(v.done)break;n+=v.value.length;if(n>20971520){await reader.cancel();throw Error('Arquivo excede o limite.');}partes.push(Buffer.from(v.value));}return Buffer.concat(partes);}
 };
}
