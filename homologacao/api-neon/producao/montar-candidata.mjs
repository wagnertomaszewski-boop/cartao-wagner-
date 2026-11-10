import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';import {resolve} from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';import {validarConfiguracaoPublica} from './configuracao.mjs';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
export async function montarCandidata({config,destino}){
 validarConfiguracaoPublica(config);if(!/^[0-9a-f]{40}$/.test(config.versao||''))throw Error('Fixe o commit da candidata.');const out=resolve(destino);if(out===resolve(repo)||out.startsWith(resolve(repo)+'/'))throw Error('Gerar candidata fora da árvore publicada.');
 let html=await readFile(new URL('../../../v2/index.html',import.meta.url),'utf8');
 const fotoAntes=[...html.matchAll(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g)].map(x=>createHash('sha256').update(x[0]).digest('hex'));
 const original=html;
 html=html.replace(/<aside id="aviso-hml"[^>]*>[\s\S]*?<\/aside>/,'');
 html=html.replace(/if\(location\.origin==='https:\/\/mandato-neon-homologacao\.onrender\.com'&&location\.pathname\.startsWith\('\/hml\/'\)\)document\.getElementById\('aviso-hml'\)\.hidden=false;/,'');
 html=html.replace(/if\(location\.origin==='https:\/\/mandato-neon-homologacao\.onrender\.com'&&location\.pathname\.startsWith\('\/hml\/'\)\)\{const rotas=\{[^}]*\};if\(rotas\[id\]\)\{location\.assign\(rotas\[id\]\);return;\}\}/,'');
 html=html.replace(/document\.getElementById\("formSolicitacao"\)\.addEventListener\("submit",async function\(e\)\{.*?\n(?=const steps=)/s,'');
 html=html.replace(/async function historico\(p,statusAtual\).*?\n(?=\/\/ Integração segura)/s,'');
 html=html.replace(/\/\/ Integração segura desabilitada.*?\n(?=document\.querySelectorAll\("\.tab"\))/s,'');
 html=html.replace(/async function projetoRpc\(nome,payload\)\{[^\n]*\n/,`async function projetoRpc(nome,payload){const r=await fetch(SUPABASE_URL+'/rest/v1/rpc/'+nome,{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Não foi possível consultar os projetos agora.');return r.json()}\n`);
 html=html.replace('type="file" accept="image/*,.pdf"','type="file" multiple accept="image/jpeg,image/png,application/pdf"').replace('Você pode anexar um arquivo para ajudar a identificar a situação.','Selecione até 20 fotografias ou PDFs, com até 1 MB cada.');
 html=html.replace('Consulte o andamento pelo número do protocolo.','Consulte com seu protocolo e sua chave individual de acompanhamento.');
 html=html.replace('A abertura dos arquivos estará disponível após a conclusão da autorização segura.','Os anexos são abertos somente após validar protocolo e chave.');
 html=html.replace('<script src="./solicitacao-localizacao.js" defer></script>',`<script>document.getElementById('formSolicitacao').addEventListener('submit',e=>e.preventDefault());for(const id of ['botaoEnviar','consultar'])document.getElementById(id).disabled=true;document.getElementById('mensagem').textContent='Carregando acesso seguro. Se não carregar, tente novamente mais tarde.';document.getElementById('mensagem').style.display='block';</script><script type="module" src="./seguranca/tela-privada.mjs"></script>`);
 html=html.replace(/https:\/\/unpkg.com\/leaflet@1\.9\.4\/dist\//g,'./vendor/leaflet/');
 if(html===original||html.includes('consulta_publica_protocolo')||html.includes('criar_solicitacao_com_localizacao')||html.includes('RECUPERACAO_MANUAL_HML'))throw Error('Remoção dos caminhos antigos não conferida.');
 const fotoDepois=[...html.matchAll(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g)].map(x=>createHash('sha256').update(x[0]).digest('hex'));if(JSON.stringify(fotoAntes)!==JSON.stringify(fotoDepois))throw Error('Imagem aprovada alterada.');
 await mkdir(out+'/v2/seguranca',{recursive:true});await writeFile(out+'/v2/index.html',html);
 for(const [fonte,alvo]of [['tela.mjs','tela-privada.mjs'],['cliente.mjs','cliente.mjs']])await cp(new URL('./web/'+fonte,import.meta.url),out+'/v2/seguranca/'+alvo);
 const configuracao=(await readFile(new URL('./configuracao.mjs',import.meta.url),'utf8')).split('export function validarConfiguracaoServidor')[0];await writeFile(out+'/v2/seguranca/configuracao.mjs',configuracao);
 await writeFile(out+'/v2/seguranca/configuracao-publica.json',JSON.stringify(config,null,2));
 for(const [fonte,alvo]of [['localizacao-solicitacao-hml.mjs','localizacao.mjs'],['fotos-solicitacao-hml.mjs','fotos.mjs']])await cp(new URL('../telas/v2/seguranca/'+fonte,import.meta.url),out+'/v2/seguranca/'+alvo);
 await cp(new URL('./web/service-worker-privado.js',import.meta.url),out+'/v2/service-worker-privado.js');
 await cp(new URL('../../../v2/vendor/leaflet/',import.meta.url),out+'/v2/vendor/leaflet',{recursive:true});
 let painel=await readFile(new URL('../../../painel/index.html',import.meta.url),'utf8');
 const antigo=`const url = esc(a.url || "");
                  return url ? '<a href="' + url + '" target="_blank" rel="noopener">📎 ' + nome + '</a>' : "";`;
 const novo=`const caminho = a.caminho || (a.url && a.url.startsWith(SUPABASE_URL+'/storage/v1/object/public/documentos-respostas/') ? decodeURIComponent(a.url.split('/documentos-respostas/')[1]) : '');
                  return caminho ? '<button type="button" data-documento-resposta="'+esc(caminho)+'">📎 '+nome+'</button>' : '';`;
 if(!painel.includes(antigo))throw Error('Renderização de documentos do Painel mudou; revisar candidata.');
 painel=painel.replace(antigo,novo).replace('url: caminhoPublicoStorage("documentos-respostas", caminho)','url: null');
 painel=painel.replace('</body>',`<script>window.MANDATO_CHAVE_PUBLICA=SUPABASE_KEY;document.addEventListener('click',e=>{const b=e.target.closest('[data-documento-resposta]');if(b)window.abrirDocumentoRespostaPrivado(b.dataset.documentoResposta);});</script><script type="module" src="../v2/seguranca/painel-privado.mjs"></script></body>`);
 await mkdir(out+'/painel',{recursive:true});await writeFile(out+'/painel/index.html',painel);await cp(new URL('./web/painel.mjs',import.meta.url),out+'/v2/seguranca/painel-privado.mjs');
 // O nome do módulo raiz e de cada import muda por versão; não depende de limpar
 // dados do aplicativo nem de esperar o max-age=600 observado no Pages.
 const versao=encodeURIComponent(config.versao);
 for(const nome of ['tela-privada.mjs','cliente.mjs','configuracao.mjs','localizacao.mjs','fotos.mjs','painel-privado.mjs']){
  const caminho=out+'/v2/seguranca/'+nome;
  let codigo=await readFile(caminho,'utf8');codigo=codigo.replace(/from '(\.\/[^'?]+\.mjs)'/g,(_m,p)=>"from '"+p+'?v='+versao+"'");await writeFile(caminho,codigo);
 }
 html=html.replace('./seguranca/tela-privada.mjs','./seguranca/tela-privada.mjs?v='+versao);await writeFile(out+'/v2/index.html',html);
 painel=painel.replace('../v2/seguranca/painel-privado.mjs','../v2/seguranca/painel-privado.mjs?v='+versao);await writeFile(out+'/painel/index.html',painel);
 const manifest={publicado:false,configuracao:config,imagensPreservadas:fotoAntes,sha256Index:createHash('sha256').update(html).digest('hex'),bloqueios:['API produtiva e credenciais restritas','backup produtivo com Storage restaurado','aceite físico','autorização final']};await writeFile(out+'/manifesto-candidata.json',JSON.stringify(manifest,null,2));return manifest;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const config=JSON.parse(await readFile(process.argv[2],'utf8'));const m=await montarCandidata({config,destino:process.argv[3]});console.log(JSON.stringify({publicado:m.publicado,imagensPreservadas:m.imagensPreservadas.length,bloqueios:m.bloqueios}));}
