// Política de conferência manual. Não constitui atestado assinado nem autoriza escrita.
// Somente o serviço privado poderá emitir atestado após reautenticação administrativa.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ID=/^[1-9][0-9]{0,15}$/;
export function validarConferenciaManual({solicitacaoId,operadorId,confirmacaoWhatsapp,conferenciaPessoal,reatenticacaoRecente,justificativa}={}){
 if(!ID.test(String(solicitacaoId))||!UUID.test(String(operadorId)))return false;
 if(confirmacaoWhatsapp!==true||conferenciaPessoal!==true||reatenticacaoRecente!==true)return false;
 if(typeof justificativa!=='string'||justificativa.trim().length<20||justificativa.length>500)return false;
 return true;
}
