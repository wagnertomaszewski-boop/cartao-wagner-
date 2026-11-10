import {createHmac} from 'node:crypto';import {PROJETO} from './configuracao.mjs';
const buckets=new Set(['anexos-solicitacoes','documentos-respostas']);
export function caminhoLegado(valor,bucket){
 if(typeof valor!=='string'||!buckets.has(bucket))return null;
 let caminho=valor;
 if(/^https?:/.test(valor)){try{const u=new URL(valor),prefixo='/storage/v1/object/public/'+bucket+'/';if(u.origin!==`https://${PROJETO}.supabase.co`||u.search||u.hash||!u.pathname.startsWith(prefixo))return null;caminho=decodeURIComponent(u.pathname.slice(prefixo.length));}catch{return null;}}
 if(!caminho||caminho.length>1024||/[\x00-\x1f\x7f\\%?#]/.test(caminho)||caminho.split('/').some(p=>!p||p==='.'||p==='..'))return null;
 return {bucket,caminho};
}
export function anexosLegados(s,respostas,segredo){
 const itens=[];const incluir=(v,bucket)=>{const caminho=caminhoLegado(typeof v==='string'?v:v?.caminho||v?.url,bucket);if(!caminho)return;const raw=createHmac('sha256',segredo).update(s.id+':'+bucket+':'+caminho.caminho).digest();raw[6]=(raw[6]&15)|64;raw[8]=(raw[8]&63)|128;const hex=raw.subarray(0,16).toString('hex'),id=hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);const nome=typeof v==='object'&&v?.nome?v.nome:caminho.caminho.split('/').pop(),ext=nome.split('.').pop().toLowerCase(),mime=ext==='png'?'image/png':['jpg','jpeg'].includes(ext)?'image/jpeg':ext==='pdf'?'application/pdf':'application/octet-stream';if(!itens.some(x=>x.bucket===bucket&&x.caminho===caminho.caminho))itens.push({id,nome,mime,...caminho});};
 for(const v of Array.isArray(s.anexos)?s.anexos:[])incluir(v,'anexos-solicitacoes');for(const r of respostas)for(const v of Array.isArray(r.anexos)?r.anexos:[])incluir(v,'documentos-respostas');return itens;
}
