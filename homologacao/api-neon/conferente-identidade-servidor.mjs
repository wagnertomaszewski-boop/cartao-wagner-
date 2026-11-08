// Adaptador exclusivamente do servidor privado. Não usar valores declarados pelo navegador
// como prova de WhatsApp, conferência pessoal ou reautenticação administrativa.
import {validarConferenciaManual} from './politica-conferencia-manual.mjs';

export function criarConferenteIdentidadeServidor({
 consultarWhatsappConfirmado,consultarConferenciaPessoal,consultarReautenticacao,
 agora=()=>Date.now()
}={}){
 if([consultarWhatsappConfirmado,consultarConferenciaPessoal,consultarReautenticacao].some(fn=>typeof fn!=='function'))
  throw Error('Três fontes independentes e privadas são obrigatórias');
 return async function confirmar(pedido={}){
  const {solicitacaoId,operadorId,acao}=pedido;
  if(!['emitir','revogar'].includes(acao)||
   !validarConferenciaManual({solicitacaoId,operadorId,confirmacaoWhatsapp:true,
    conferenciaPessoal:true,reatenticacaoRecente:true,justificativa:'Verificação preliminar do identificador.'}))
   return false;
  // Consultas sequenciais para evitar solicitar evidências sensíveis sem necessidade.
  // Cada provedor deve consultar estado persistido e autenticado, não dados do pedido.
  try{
   const whatsapp=await consultarWhatsappConfirmado({solicitacaoId:String(solicitacaoId)});
   if(whatsapp?.confirmado!==true||whatsapp?.solicitacaoId!==String(solicitacaoId))return false;
   const pessoal=await consultarConferenciaPessoal({solicitacaoId:String(solicitacaoId),operadorId});
   if(pessoal?.confirmado!==true||pessoal?.solicitacaoId!==String(solicitacaoId)||
    pessoal?.operadorId!==operadorId)return false;
   const reauth=await consultarReautenticacao({operadorId});
   const tempo=agora();
   if(reauth?.confirmado!==true||reauth?.operadorId!==operadorId||
    !Number.isSafeInteger(tempo)||!Number.isSafeInteger(reauth?.confirmadoEm)||
    reauth.confirmadoEm>tempo||tempo-reauth.confirmadoEm>300000)return false;
   const conferencia={confirmacaoWhatsapp:true,conferenciaPessoal:true,
    reatenticacaoRecente:true,justificativa:pessoal.justificativa};
   return validarConferenciaManual({...conferencia,solicitacaoId,operadorId})?conferencia:false;
  }catch{return false;}
 };
}
