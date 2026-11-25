import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,relative,dirname,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {montarCandidata} from './montar-candidata.mjs';

const raiz=fileURLToPath(new URL('../',import.meta.url));
const projeto=fileURLToPath(new URL('../../../',import.meta.url));
const entrada='producao/supabase/functions/mandato-privado/index.ts';
const configEdge='producao/supabase/config.toml';
const [versao,destino]=process.argv.slice(2);
if(!destino||!/^[0-9a-f]{40}$/.test(versao??''))throw Error('Uso: node preparar-release.mjs <commit completo> <novo diretório externo ao repositório>');
const out=resolve(destino);
const relativo=relative(projeto,out);
if(!relativo||(!isAbsolute(relativo)&&!relativo.startsWith('..'+ '/')))throw Error('Use um diretório fora do repositório.');
await mkdir(out);
const arquivos=new Map();
async function copiar(caminho){
 if(arquivos.has(caminho))return;
 const origem=resolve(raiz,caminho),local=relative(raiz,origem);
 if(local.startsWith('..')||isAbsolute(local))throw Error('Dependência fora da API.');
 const bytes=await readFile(origem);
 const destino=resolve(out,'edge',local);
 await mkdir(dirname(destino),{recursive:true});
 await cp(origem,destino);
 arquivos.set(local,createHash('sha256').update(bytes).digest('hex'));
 for(const [,referencia] of bytes.toString('utf8').matchAll(/\b(?:from|import)\s*['"](\.[^'"]+)['"]/g))
  await copiar(relative(raiz,resolve(dirname(origem),referencia)));
}
await copiar(entrada);
await copiar(configEdge);
const web=await montarCandidata({
 config:{ambiente:'producao',projeto:'pmmsdjozyyxkbuqlkfpb',apiBase:'https://pmmsdjozyyxkbuqlkfpb.supabase.co/functions/v1/mandato-privado',versao},
 destino:resolve(out,'web')
});
await writeFile(resolve(out,'manifesto.json'),JSON.stringify({versao,publicado:false,edge:{entrada,arquivos:Object.fromEntries(arquivos)},web},null,2)+'\n');
console.log('Artefatos da Edge e dos clientes web preparados. Publicação bloqueada.');
