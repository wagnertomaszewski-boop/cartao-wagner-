// Validação independente do vínculo protocolo-ID antes da emissão.
// A fonte de vínculo é injetada pelo servidor confiável, nunca pelo cliente.
export function criarVerificadorVinculoLegado({buscarVinculo,validarComprovante}={}){
 if(typeof buscarVinculo!=='function'||typeof validarComprovante!=='function')
  throw Error('Fonte de vínculo e validação de comprovante obrigatórias');
 return async function verificarIdentidade({protocolo,comprovante}={}){
  if(typeof protocolo!=='string'||!protocolo.trim()||protocolo.length>40)
   return false;
  const p=protocolo.trim();
  const valido=await validarComprovante({protocolo:p,comprovante});
  if(valido!==true)return false;
  const vinculo=await buscarVinculo({protocolo:p});
  if(!vinculo||!Number.isSafeInteger(vinculo.solicitacaoId)||vinculo.solicitacaoId<=0||
   vinculo.protocolo!==p)return false;
  return {solicitacaoId:vinculo.solicitacaoId};
 };
}
