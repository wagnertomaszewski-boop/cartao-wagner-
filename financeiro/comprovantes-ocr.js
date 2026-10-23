"use strict";
const fold=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const banks=[
["Banrisul",/\bbanrisul\b/],["Cresol",/\bcresol\b/],
["Banco do Brasil",/\bbanco do brasil\b/],["Caixa",/\bcaixa economica\b|\bcaixa federal\b/],
["Sicredi",/\bsicredi\b/],["Sicoob",/\bsicoob\b/],["Bradesco",/\bbradesco\b/],
["Itaú",/\bitau\b/],["Santander",/\bsantander\b/],["Nubank",/\bnubank\b|\bnu pagamentos\b/],
["Inter",/\bbanco inter\b/],["C6 Bank",/\bc6 bank\b/],["Mercado Pago",/\bmercado pago\b/],["PicPay",/\bpicpay\b/]
];
function extractFields(raw){
const lines=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const norm=fold(raw),found=banks.filter(([_,rx])=>rx.test(norm)).map(x=>x[0]);
$("banco").value=found.length===1?found[0]:"";
const payeeRe=/\b(beneficiari[oa]|favorecid[oa]|recebedor(?:a)?|destinatari[oa]|quem recebeu|nome do recebedor)\b/i;
for(let i=0;i<lines.length;i++){
const s=fold(lines[i]),m=s.match(payeeRe);if(!m)continue;
let v=lines[i].slice(m.index+m[0].length).replace(/^[\s:–-]+/,"").trim();
if(!v||/^(nome|dados|cpf|cnpj|instituicao)[\s:]*$/i.test(fold(v)))v=lines[i+1]||"";
v=v.replace(/\s+(?:cpf|cnpj|chave pix|institui[cç][aã]o)[\s:].*$/i,"").trim();
if(v.length>=3&&v.length<=160&&!/^\d[\d .\/-]+$/.test(v)){$("beneficiario").value=v;break}
}
const amounts=[];
for(const line of lines){
const label=/\b(valor|total|quantia|montante)\b/.test(fold(line)),price=/R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d+(?:\.\d{2})?)/gi;
let match,seen=false;while((match=price.exec(line))){const n=money(match[1]);if(n>0){amounts.push({n,label});seen=true}}
if(!seen&&label){let m=line.match(/(?:valor|total|quantia|montante)\D{0,24}(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/i);if(m){let n=money(m[1]);if(n>0)amounts.push({n,label:true})}}
}
const prioritized=amounts.some(x=>x.label)?amounts.filter(x=>x.label):amounts;
const amountsUnique=[...new Set(prioritized.map(x=>x.n))];
$("valor").value=amountsUnique.length===1?amountsUnique[0].toFixed(2).replace(".",","):"";
const dates=[];
for(let i=0;i<lines.length;i++){
const m=lines[i].match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](20\d{2})\b/);
if(!m)continue;const day=+m[1],month=+m[2],year=+m[3],d=new Date(year,month-1,day);
if(d.getDate()!==day||d.getMonth()!==month-1)continue;
const value=year+"-"+String(month).padStart(2,"0")+"-"+String(day).padStart(2,"0");
const tagged=/pagamento|efetuad|realizad|transferencia|data da transacao/.test(fold(lines[i]));dates.push({value,tagged})
}
let chosenDates=dates.some(x=>x.tagged)?dates.filter(x=>x.tagged):dates;
let distinct=[...new Set(chosenDates.map(x=>x.value))];if(distinct.length===1)$("data").value=distinct[0];
if(/pix/.test(norm))$("forma").value="Pix";
else if(/transferencia|ted\b/.test(norm))$("forma").value="Transferência";
else if(/boleto/.test(norm))$("forma").value="Boleto";
if(/comprovante.*(pagamento|transferencia|pix)|pagamento\s+(realizado|efetuado|concluido|aprovado)|transferencia\s+(realizada|concluida)|transacao\s+concluida/.test(norm))$("situacao").value="pago";
const categories=[[/gasolina|diesel|combustivel/,"Diesel"],[/adubo|fertilizante|calcario|insumo|sementes?|defensivo/,"Insumos"],[/tratores?|pecas? de maquina|maquinas?/,"Máquinas"],[/energia eletrica|conta de luz/,"Energia"],[/peao|mao de obra|diaria/,"Mão de obra"],[/financiamento|custeio|emprestimo/,"Financiamentos"],[/suinos?|porcos?/,"Suínos"],[/milho/,"Milho"],[/tabaco|fumo/,"Tabaco"]];
for(let [rx,v] of categories){if(rx.test(norm)){$("categoria").value=v;break}}
for(let line of lines){let m=line.match(/(?:id\s*(?:da\s*)?(?:transa[cç][aã]o|opera[cç][aã]o)|identificador|autentica[cç][aã]o)\s*[:\-]?\s*([a-zA-Z0-9.\-]{6,90})/i);if(m){$("idTransacao").value=m[1];break}}
let warnings=[];
if(found.length>1)warnings.push("Vários bancos encontrados: confirma qual deles deve ser registrado.");
if(amountsUnique.length!==1)warnings.push("Não foi possível decidir um único valor: digita o valor correto.");
if(distinct.length>1)warnings.push("Há datas diferentes: verifica a data do pagamento.");
if(!$("beneficiario").value)warnings.push("Beneficiário não identificado com segurança.");
$("ocrStatus").textContent=warnings.length?"Leitura parcial. "+warnings.join(" "):"Dados sugeridos pela foto. Confere antes de salvar.";
}
async function loadOCR(){
if(window.Tesseract)return;
await new Promise((ok,fail)=>{const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";s.onload=ok;s.onerror=()=>fail(Error("O leitor não carregou. Podes preencher manualmente."));document.head.append(s)})
}
let busy=false;
async function onPhoto(file){
if(!file||busy)return;busy=true;foto=null;fotoHash=null;$("resultado").classList.add("hidden");
$("ocrStatus").textContent="Preparando imagem…";
try{
foto=await processPhoto(file);fotoHash=await fingerprint(foto);
if(fotoUrl)URL.revokeObjectURL(fotoUrl);
fotoUrl=URL.createObjectURL(foto);$("preview").src=fotoUrl;$("preview").classList.remove("hidden");
$("progresso").classList.remove("hidden");
$("ocrStatus").textContent="Reconhecendo texto no dispositivo. Se falhar, podes preencher manualmente.";
await loadOCR();
let worker=await window.Tesseract.createWorker("por+eng",1,{logger:m=>{if(Number.isFinite(m.progress))$("progresso").value=m.progress}});
try{
const result=await worker.recognize(foto);
const txt=result?.data?.text||"";$("ocrTexto").textContent=txt;$("textoBox").classList.remove("hidden");
if(txt.trim())extractFields(txt);
else $("ocrStatus").textContent="Não encontrei texto legível. Digita os dados manualmente, a foto ainda pode ser salva.";
}finally{await worker.terminate()}
}catch(err){$("ocrStatus").textContent="Leitura automática indisponível: "+err.message+" Se a prévia aparece, podes preencher e salvar os campos manualmente."}
finally{busy=false;$("progresso").classList.add("hidden")}
}
$("camera").onchange=e=>onPhoto(e.target.files?.[0]);
$("galeria").onchange=e=>onPhoto(e.target.files?.[0]);