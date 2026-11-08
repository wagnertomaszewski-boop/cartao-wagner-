// Confirmação pelo próprio cidadão: página pública sem autenticação administrativa.
// A confirmação do código é apenas prova de posse do código, NÃO de identidade
// quando o operador também vê o código no link manual do WhatsApp.
export function criarOperacoesConfirmacaoCidadao({verificacao}={}){
 if(typeof verificacao?.confirmar!=='function')
  throw Error('Confirmação atômica obrigatória');
 return Object.freeze({
  confirmar:async({dados}={})=>{
   const {desafioId,codigo,solicitacaoId,acao}=dados||{};
   if(typeof desafioId!=='string'||!/^[a-f0-9]{32}$/.test(desafioId)||
    typeof codigo!=='string'||!/^[0-9]{6}$/.test(codigo)||
    !/^[1-9][0-9]{0,15}$/.test(String(solicitacaoId))||
    !['emitir','revogar'].includes(acao))throw Error('Dados inválidos');
   const confirmado=await verificacao.confirmar({desafioId,codigo,solicitacaoId,acao});
   if(confirmado!==true)return {confirmado:false};
   // A função Neon confirma e registra atomicamente; não repetir a escrita.
   return {confirmado:true};
  }
 });
}
