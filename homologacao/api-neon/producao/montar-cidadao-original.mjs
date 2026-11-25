import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';

const raiz=new URL('../../../',import.meta.url);
const ler=nome=>readFile(new URL(nome,raiz),'utf8');
const modulo='<script type="module" src="./mandato-seguro/cidadao.mjs"></script>';
const substituirScripts=html=>html.replace(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/gi,'').replace('</body>',modulo+'\n</body>');

export async function montarCidadaoOriginal(destino){
 const [inicio,solicitacao,acompanhar,worker]=await Promise.all(['index.html','solicitacao.html','acompanhar.html','service-worker.js'].map(ler));
 if(!solicitacao.includes('criar_solicitacao_com_anexos')||!acompanhar.includes('consultarSolicitacao()')||!worker.includes('wagner-app-'))
  throw Error('A página original mudou. Revise a integração.');
 const root=resolve(destino);
 await mkdir(resolve(root,'mandato-seguro'),{recursive:true});
 const gravar=(nome,dados)=>writeFile(resolve(root,nome),dados);
 await gravar('index.html',inicio.replace('Consulte pelo número de protocolo','Consulte com protocolo e chave de acompanhamento'));
 await gravar('solicitacao.html',substituirScripts(solicitacao)
  .replace('id="botaoEnviar" type="submit"','id="botaoEnviar" type="submit" disabled')
  .replace('accept="image/*,.pdf"','accept="image/png,image/jpeg,application/pdf"')
  .replace('id="mensagem"></div>','id="mensagem" role="status" style="white-space:pre-wrap;overflow-wrap:anywhere"></div><noscript>Ative o JavaScript para enviar a solicitação.</noscript>'));
 const campos=`<label for="chavePrivada">Chave de acompanhamento</label>
<input id="chavePrivada" type="password" autocomplete="off">
<button id="mostrarChave" type="button">Mostrar chave</button>
<button id="consultaPrivada" type="button" disabled>CONSULTAR SOLICITAÇÃO</button>
<details><summary>Primeiro acesso ou perdi minha chave</summary>
<label for="whatsappRecuperacao">WhatsApp cadastrado</label><input id="whatsappRecuperacao" type="tel" autocomplete="off">
<button id="pedirRecuperacao" type="button" disabled>Pedir recuperação</button>
<p>Volte neste navegador para validar o código recebido pelo WhatsApp.</p>
<label for="codigoRecuperacao">Código de seis dígitos</label><input id="codigoRecuperacao" inputmode="numeric" maxlength="6" autocomplete="one-time-code">
<button id="validarRecuperacao" type="button" disabled>Validar código</button>
<p id="estadoRecuperacao" role="status"></p></details>`;
 await gravar('acompanhar.html',substituirScripts(acompanhar)
  .replace(/<button onclick="consultarSolicitacao\(\)">[\s\S]*?<\/button>/,campos)
  .replace('<div id="rRespostas"></div>','<div id="rRespostas"></div><div id="rAnexos"></div>')
  .replace('id="erro">','id="erro" role="alert">'));
 // Conserva o cache offline público do cartão. As telas privadas e os seus módulos exigem rede.
 await gravar('service-worker.js',worker
  .replace(/"wagner-app-v[^"]+"/,'"wagner-app-v6-privado"')
  .replace(/^\s*"\.\/(?:solicitacao|acompanhar)\.html",\n/gm,'\n')
  .replace('.then(cache => cache.addAll(ARQUIVOS))','.then(cache => cache.addAll(ARQUIVOS)).then(() => self.skipWaiting())')
  .replace('  event.respondWith(', `  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  if(/\\/(?:solicitacao|acompanhar)\\.html$/.test(url.pathname)||url.pathname.includes('/mandato-seguro/')||url.pathname.includes('/v2/seguranca/'))return;
  event.respondWith(`));
 await copyFile(new URL('./web/cidadao-original.mjs',import.meta.url),resolve(root,'mandato-seguro/cidadao.mjs'));
}
