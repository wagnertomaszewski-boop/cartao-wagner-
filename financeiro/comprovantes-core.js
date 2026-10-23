"use strict";
const BASE="https://pmmsdjozyyxkbuqlkfpb.supabase.co";
const KEY="sb_publishable_DA687gC36Y6UO3up6G8ZDA_OeLoqZk_";
const ADMIN="ca5c30ec-828e-4c95-a0b9-a415bb9b3643";
const STORAGE="wt_controle_financeiro_login_v1", BUCKET="comprovantes-financeiros";
const $=id=>document.getElementById(id);
let session=null, foto=null, fotoHash=null, fotoUrl=null, privateImageUrl=null;
function aviso(t,success=false){const e=$("resultado");e.className=success?"ok":"error";e.textContent=t;e.classList.remove("hidden");e.scrollIntoView({behavior:"smooth",block:"nearest"})}
function money(s){let t=String(s||"").replace(/[^\d.,]/g,"");if(!t)return NaN;if(t.includes(",")&&t.includes("."))t=t.replace(/\./g,"").replace(",",".");else if(t.includes(","))t=t.replace(",",".");else if(/^\d{1,3}(\.\d{3})+$/.test(t))t=t.replace(/\./g,"");return Number(t)}
function today(){const d=new Date(),p=n=>String(n).padStart(2,"0");return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())}
async function authorized(jwt){const r=await fetch(BASE+"/auth/v1/user",{headers:{apikey:KEY,Authorization:"Bearer "+jwt}});return r.ok&&(await r.json()).id===ADMIN}
async function refresh(){if(!session?.refresh_token)throw Error("Sessão expirada. Entre novamente.");
const r=await fetch(BASE+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{apikey:KEY,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:session.refresh_token})});
const j=await r.json();if(!r.ok||!j.access_token||!(await authorized(j.access_token)))throw Error("Faça login novamente.");
session={access_token:j.access_token,refresh_token:j.refresh_token,expires_at:Date.now()+(j.expires_in||3600)*1000};localStorage.setItem(STORAGE,JSON.stringify(session))}
async function jwt(){if(!session)throw Error("Faça login.");if(Date.now()>=(session.expires_at||0)-60000)await refresh();return session.access_token}
async function api(path,opts={}){let token=await jwt();const r=await fetch(BASE+path,{...opts,headers:{apikey:KEY,Authorization:"Bearer "+token,...opts.headers}});
const data=await r.json().catch(()=>null);if(!r.ok)throw Error(data?.message||data?.error||"Erro da API ("+r.status+")");return data}
async function show(){if(!await authorized(await jwt()))throw Error("Conta sem autorização");
$("login").classList.add("hidden");$("main").classList.remove("hidden");$("data").value=today();
const id=new URLSearchParams(location.search).get("ver");if(/^\d{1,12}$/.test(id||""))showExisting(id)}
async function init(){try{session=JSON.parse(localStorage.getItem(STORAGE)||"null");if(!session?.access_token)return;await show()}catch(err){session=null}}
$("loginForm").onsubmit=async e=>{e.preventDefault();try{
const r=await fetch(BASE+"/auth/v1/token?grant_type=password",{method:"POST",headers:{apikey:KEY,"Content-Type":"application/json"},body:JSON.stringify({email:$("email").value.trim(),password:$("senha").value})});
const j=await r.json();if(!r.ok||!j.access_token||!(await authorized(j.access_token)))throw Error("Senha, e-mail ou autorização inválidos.");
session={access_token:j.access_token,refresh_token:j.refresh_token,expires_at:Date.now()+(j.expires_in||3600)*1000};localStorage.setItem(STORAGE,JSON.stringify(session));$("senha").value="";await show()
}catch(err){$("loginError").textContent=err.message;$("loginError").classList.remove("hidden")}};
async function showExisting(id){$("viewer").classList.remove("hidden");try{
const data=await api("/rest/v1/controle_financeiro_lancamentos?select=comprovante_path&area=eq.agricultura&id=eq."+id+"&limit=1");
const path=data?.[0]?.comprovante_path;if(!path)throw Error("Este lançamento não tem foto.");
const url=BASE+"/storage/v1/object/authenticated/"+BUCKET+"/"+path.split("/").map(encodeURIComponent).join("/");
const response=await fetch(url,{headers:{apikey:KEY,Authorization:"Bearer "+await jwt()}});
if(!response.ok)throw Error("O comprovante não pôde ser aberto.");if(privateImageUrl)URL.revokeObjectURL(privateImageUrl);
privateImageUrl=URL.createObjectURL(await response.blob());$("viewerImage").src=privateImageUrl
}catch(e){$("viewerError").textContent=e.message;$("viewerError").classList.remove("hidden")}}
$("fecharFoto").onclick=()=>{if(privateImageUrl)URL.revokeObjectURL(privateImageUrl);$("viewer").classList.add("hidden");history.replaceState(null,"",location.pathname)};
async function processPhoto(file){
if(!file?.type.startsWith("image/"))throw Error("Selecione uma foto JPG ou PNG.");
if(file.size>25*1024*1024)throw Error("Imagem maior que 25 MB.");
const url=URL.createObjectURL(file);
try{const img=new Image();await new Promise((ok,bad)=>{img.onload=ok;img.onerror=()=>bad(Error("Não consegui abrir a imagem. Tenta JPG."));img.src=url});
const scale=Math.min(1,1900/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement("canvas");
canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
const ctx=canvas.getContext("2d");ctx.fillStyle="white";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
const jpg=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",.86));
if(!jpg||jpg.size>8*1024*1024)throw Error("A foto precisa ficar abaixo de 8 MB.");return jpg
}finally{URL.revokeObjectURL(url)}}
async function fingerprint(blob){if(!crypto.subtle)return null;const bytes=await crypto.subtle.digest("SHA-256",await blob.arrayBuffer());return Array.from(new Uint8Array(bytes)).map(n=>n.toString(16).padStart(2,"0")).join("")}
async function upload(){const path=ADMIN+"/"+crypto.randomUUID()+".jpg",token=await jwt();
const r=await fetch(BASE+"/storage/v1/object/"+BUCKET+"/"+path,{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+token,"Content-Type":"image/jpeg","x-upsert":"false"},body:foto});
if(!r.ok){const j=await r.json().catch(()=>null);throw Error("Falha no anexo: "+(j?.message||r.status))}return path}
async function cleanup(path){try{await fetch(BASE+"/storage/v1/object/"+BUCKET+"/"+path,{method:"DELETE",headers:{apikey:KEY,Authorization:"Bearer "+await jwt()}})}catch(e){}}
async function duplicate(amount,date){return await api("/rest/v1/controle_financeiro_lancamentos?select=id,comprovante_sha256&area=eq.agricultura&tipo=eq.despesa&valor=eq."+amount+"&data_mov=eq."+date+"&limit=30")}
$("form").onsubmit=async e=>{e.preventDefault();$("resultado").classList.add("hidden");
if(!foto)return aviso("Anexa a foto do comprovante primeiro.");
const value=money($("valor").value),date=$("data").value;
if(!Number.isFinite(value)||value<=0||value>999999999.99)return aviso("Verifica o valor.");
if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return aviso("Confere a data.");
if($("descricao").value.trim().length<2)return aviso("Informe uma descrição.");
const button=$("salvar");button.disabled=true;button.textContent="Salvando…";let path=null;
try{const candidates=await duplicate(value,date);
if(fotoHash&&candidates.some(d=>d.comprovante_sha256===fotoHash))throw Error("Este comprovante já foi cadastrado. Registro não duplicado.");
if(candidates.length&&!confirm("Já existe um pagamento nesta data com o mesmo valor. Confirma que é outra despesa?"))return;
path=await upload();
const payload={area:"agricultura",tipo:"despesa",origem:"foto",valor:value,data_mov:date,descricao:$("descricao").value.trim(),categoria:$("categoria").value,forma:$("forma").value,conta:$("conta").value.trim()||"Não informada",banco:$("banco").value.trim()||null,banco_destino:$("bancoDestino").value.trim()||null,beneficiario:$("beneficiario").value.trim()||null,situacao_pagamento:$("situacao").value,identificador_transacao:$("idTransacao").value.trim()||null,comprovante_path:path,comprovante_sha256:fotoHash};
const result=await api("/rest/v1/controle_financeiro_lancamentos",{method:"POST",headers:{"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify(payload)});
if(!result?.length)throw Error("Registro não confirmado pelo banco.");
path=null;foto=null;fotoHash=null;if(fotoUrl)URL.revokeObjectURL(fotoUrl);
$("preview").classList.add("hidden");$("camera").value="";$("galeria").value="";$("form").reset();$("data").value=today();
aviso("Despesa e comprovante salvos com sucesso na Agricultura! Registro "+result[0].id+".",true);
}catch(err){if(path)await cleanup(path);aviso(err.message)}finally{button.disabled=false;button.textContent="💾 Salvar despesa e foto"}};
$("cameraBtn").onclick=()=>$("camera").click();$("galeriaBtn").onclick=()=>$("galeria").click();
init();