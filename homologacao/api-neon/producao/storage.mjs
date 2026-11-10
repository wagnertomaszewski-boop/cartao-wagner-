import {PROJETO} from './configuracao.mjs';
import {caminhoLegado} from './anexos-legados.mjs';
// Credencial exclusivamente no servidor. Arquivos retornam no corpo, sem URL pública.
export function criarStoragePrivado({credencial,buscar=fetch}){
 if(typeof credencial!=='string'||credencial.length<32)throw Error('Credencial privada de Storage ausente.');
 function url(caminho,bucket='anexos-solicitacoes'){const validado=caminhoLegado(caminho,bucket);if(!validado||/^https?:/.test(caminho))throw Error('Caminho privado inválido.');return `https://${PROJETO}.supabase.co/storage/v1/object/`+bucket+'/'+caminho.split('/').map(encodeURIComponent).join('/');}
 const headers={apikey:credencial,Authorization:'Bearer '+credencial};
 return {
 async enviar(caminho,bytes,mime){const r=await buscar(url(caminho),{method:'POST',headers:{...headers,'Content-Type':mime,'x-upsert':'false'},body:bytes,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Upload privado indisponível.');},
 async baixar(caminho,bucket){const r=await buscar(url(caminho,bucket),{headers,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Arquivo privado indisponível.');if(Number(r.headers.get('content-length'))>20971520)throw Error('Arquivo excede o limite.');const reader=r.body.getReader(),partes=[];let n=0;while(true){const v=await reader.read();if(v.done)break;n+=v.value.length;if(n>20971520){await reader.cancel();throw Error('Arquivo excede o limite.');}partes.push(Buffer.from(v.value));}return Buffer.concat(partes);}
 };
}
