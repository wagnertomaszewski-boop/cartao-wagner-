import {PROJETO} from './configuracao.mjs';
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(x);
export function criarMfaWeb({projeto,chavePublica,obterToken,buscar=fetch}){
 if(projeto!==PROJETO||typeof chavePublica!=='string'||!chavePublica.startsWith('sb_publishable_')||typeof obterToken!=='function')throw Error('Configuração MFA inválida.');
 async function enviar(path,dados){const token=await obterToken();if(!token)throw Error('Faça login novamente.');const r=await buscar('https://'+PROJETO+'.supabase.co/auth/v1'+path,{method:dados===undefined?'GET':'POST',headers:{apikey:chavePublica,Authorization:'Bearer '+token,...(dados===undefined?{}:{'Content-Type':'application/json'})},body:dados===undefined?undefined:JSON.stringify(dados),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Não foi possível confirmar o autenticador. Confira sua sessão e tente novamente.');return r.json();}
 return {
 async preparar({confirmado=false}={}){if(confirmado!==true)throw Error('Confirme o cadastramento do autenticador.');const u=await enviar('/user');const verificado=(u.factors||[]).find(f=>f.factor_type==='totp'&&f.status==='verified');if(verificado)return {id:verificado.id,jaConfigurado:true};
 const f=await enviar('/factors',{factor_type:'totp',friendly_name:'Painel do Mandato'});if(!uuid(f.id)||typeof f.totp?.qr_code!=='string'||f.totp.qr_code.length>100000)throw Error('Configuração do autenticador indisponível.');const qr=f.totp.qr_code;let imagem;if(qr.startsWith('data:image/svg+xml;')||qr.startsWith('data:image/png;'))imagem=qr;else if(qr.trim().startsWith('<svg'))imagem='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(qr);else throw Error('Formato do QR de autenticação inválido.');
 // Não retorna secret/URI nem cria registro local. A imagem deve ficar só na tela privada.
 return {id:f.id,imagem,jaConfigurado:false};},
 async confirmar({id,codigo}){if(!uuid(id)||typeof codigo!=='string'||!/^\d{6}$/.test(codigo))throw Error('Informe o código atual de seis dígitos.');const c=await enviar('/factors/'+id+'/challenge',{});if(!uuid(c.id))throw Error('Desafio MFA inválido.');const s=await enviar('/factors/'+id+'/verify',{challenge_id:c.id,code:codigo});if(typeof s.access_token!=='string'||!s.access_token)throw Error('MFA não confirmado.');return {token:s.access_token};}
 };
}
