// Confirmação de identidade por código de uso único, entregue fora do Painel.
// O provedor WhatsApp é injetado e deve confirmar envio real; não há modo de simulação em produção.
import {randomInt,randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
const ID=/^[1-9][0-9]{0,15}$/;
export function criarVerificacaoWhatsapp({buscarContatoConfirmado,enviarCodigo,armazenarDesafio,obterDesafio,consumirDesafio,segredo,agora=()=>Date.now()}={}){
 for(const [nome,fn] of Object.entries({buscarContatoConfirmado,enviarCodigo,armazenarDesafio,obterDesafio,consumirDesafio}))
  if(typeof fn!=='function')throw Error('Dependência obrigatória: '+nome);
 if(typeof segredo!=='string'||Buffer.byteLength(segredo)<32)throw Error('Segredo privado obrigatório');
 const digest=(id,codigo)=>createHmac('sha256',segredo).update(id+':'+codigo).digest();
 async function solicitar({solicitacaoId,acao}={}){
  if(!ID.test(String(solicitacaoId))||!['emitir','revogar'].includes(acao))throw Error('Pedido inválido');
  const contato=await buscarContatoConfirmado(String(solicitacaoId));
  if(!contato||typeof contato.telefone!=='string'||!/^\+55[1-9][0-9]{10}$/.test(contato.telefone))
   throw Error('WhatsApp do titular não confirmado');
  const id=randomBytes(16).toString('hex');
  const codigo=String(randomInt(0,1000000)).padStart(6,'0');
  await armazenarDesafio({id,solicitacaoId:String(solicitacaoId),acao,hash:digest(id,codigo),expiraEm:agora()+300000,maxTentativas:5});
  try{
   if(await enviarCodigo({telefone:contato.telefone,codigo,acao})!==true)
    throw Error('Entrega não confirmada');
  }catch{await consumirDesafio({id,invalidar:true});throw Error('Não foi possível enviar o código');}
  return {desafioId:id,expiraEm:agora()+300000};
 }
 async function confirmar({desafioId,codigo,solicitacaoId,acao}={}){
  if(typeof desafioId!=='string'||!/^[a-f0-9]{32}$/.test(desafioId)||
   typeof codigo!=='string'||!/^[0-9]{6}$/.test(codigo)||
   !ID.test(String(solicitacaoId))||!['emitir','revogar'].includes(acao))return false;
  // O armazenamento deve contabilizar tentativas atomicamente, invalidar ao atingir 5
  // e nunca retornar desafios expirados ou consumidos.
  const d=await obterDesafio({id:desafioId,incrementarTentativa:true});
  if(!d||d.solicitacaoId!==String(solicitacaoId)||d.acao!==acao||d.expiraEm<=agora()||
   !Buffer.isBuffer(d.hash)||d.hash.length!==32)return false;
  if(!timingSafeEqual(d.hash,digest(desafioId,codigo)))return false;
  return await consumirDesafio({id:desafioId,invalidar:false})===true;
 }
 return Object.freeze({solicitar,confirmar});
}
