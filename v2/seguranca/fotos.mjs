export function validarSelecaoArquivos(arquivos){const lista=Array.from(arquivos);if(lista.length>20)throw Error('Selecione até 20 arquivos.');for(const f of lista)if(!['image/png','image/jpeg','application/pdf'].includes(f.type)||!f.size||f.size>10485760)throw Error('Cada arquivo deve ser PNG, JPEG ou PDF de até 10 MB.');return lista;}
export async function enviarArquivosPendentes(arquivos,enviar,aoEnviar=()=>{}){for(let i=0;i<arquivos.length;){await enviar(arquivos[i]);const nome=arquivos[i].name;arquivos.splice(i,1);aoEnviar(nome);}return true;}
export function criarVisualizadorFotos(container,baixar){let geracao=0;const dialogo=document.createElement('dialog'),imagem=document.createElement('img'),fechar=document.createElement('button');dialogo.className='foto-ampliada';fechar.type='button';fechar.textContent='Fechar fotografia';dialogo.append(fechar,imagem);document.body.append(dialogo);fechar.onclick=()=>dialogo.close();dialogo.addEventListener('close',()=>imagem.removeAttribute('src'));
 function limpar(){geracao++;if(dialogo.open)dialogo.close();imagem.removeAttribute('src');container.replaceChildren();}
 function adicionar(a){if(!['image/png','image/jpeg'].includes(a.mime)||!a.id)return;const figura=document.createElement('figure'),botao=document.createElement('button'),legenda=document.createElement('figcaption');botao.type='button';botao.textContent='Visualizar foto '+a.nome;legenda.textContent=a.nome;botao.onclick=async()=>{const inicio=geracao;botao.disabled=true;try{const f=await baixar(a.id);if(inicio!==geracao)return;if(!['image/png','image/jpeg'].includes(f.mime))throw Error('Fotografia inválida.');const foto=document.createElement('img');foto.src='data:'+f.mime+';base64,'+f.base64;foto.alt=a.nome;botao.replaceChildren(foto);botao.setAttribute('aria-label','Ampliar foto '+a.nome);botao.onclick=()=>{imagem.src=foto.src;imagem.alt=a.nome;dialogo.showModal();};botao.onclick();}catch{if(inicio===geracao)botao.textContent='Não foi possível abrir. Renove sua sessão e tente novamente.';}finally{botao.disabled=false;}};figura.append(botao,legenda);container.append(figura);}
 return {limpar,adicionar};}

// Compacta apenas imagens, preserva transparência no PNG e mantém o original
// quando o navegador não consegue gerar um arquivo menor.
export async function compactarFoto(arquivo){
 if(!['image/jpeg','image/png'].includes(arquivo.type)||arquivo.size<512*1024||typeof createImageBitmap!=='function')return arquivo;
 let imagem;
 try{
  imagem=await createImageBitmap(arquivo);
  const escala=Math.min(1,1920/Math.max(imagem.width,imagem.height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(imagem.width*escala));
  canvas.height=Math.max(1,Math.round(imagem.height*escala));
  canvas.getContext('2d').drawImage(imagem,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,arquivo.type,0.82));
  return blob?.type===arquivo.type&&blob.size>0&&blob.size<arquivo.size
   ?new File([blob],arquivo.name,{type:arquivo.type,lastModified:arquivo.lastModified}):arquivo;
 }catch{return arquivo;}
 finally{imagem?.close();}
}

export async function prepararAnexo(arquivo){
 const pronto=await compactarFoto(arquivo);
 const dados=await new Promise((resolve,reject)=>{
  const leitor=new FileReader();
  const falha=()=>reject(Error('Não foi possível ler o arquivo '+arquivo.name+'.'));
  leitor.onerror=falha;
  leitor.onabort=falha;
  leitor.onload=()=>typeof leitor.result==='string'?resolve(leitor.result):falha();
  leitor.readAsDataURL(pronto);
 });
 return {nome:pronto.name,mime:pronto.type,base64:dados.slice(dados.indexOf(',')+1)};
}
