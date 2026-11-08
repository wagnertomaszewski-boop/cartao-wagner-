// Adaptador de escrita exclusivamente por RPC privada, sem INSERT direto.
// A RPC de gravação não está instalada no Neon; este módulo não a cria.
const SQL='SELECT mandato_testes.registrar_decisao_identidade_privada($1,$2,$3,$4,$5,$6) AS id';
export function criarGravadorDecisaoRpc({consultarNeon}={}){
 if(typeof consultarNeon!=='function')throw Error('Executor privado Neon obrigatório');
 return async function registrarRpc({
  protocolo,referenciaOperador,registroId,
  identidadeVerificada,evidenciaConferida,status
 }={}){
  if(typeof protocolo!=='string'||!/^[A-Za-z0-9-]{1,40}$/.test(protocolo)||
   typeof referenciaOperador!=='string'||!/^OP-[A-Za-z0-9-]{4,40}$/.test(referenciaOperador)||
   typeof registroId!=='string'||!/^[A-Za-z0-9-]{8,80}$/.test(registroId)||
   identidadeVerificada!==true||evidenciaConferida!==true||status!=='aprovado')
   throw Error('Aprovação privada inválida');
  const linhas=await consultarNeon(SQL,[protocolo,referenciaOperador,registroId,true,true,'aprovado']);
  if(!Array.isArray(linhas)||linhas.length!==1||
   !linhas[0]||!Number.isSafeInteger(Number(linhas[0].id))||Number(linhas[0].id)<1)
   throw Error('Registro privado não confirmado');
  return {registroId,id:Number(linhas[0].id)};
 };
}
