// Adaptador exclusivo para a RPC fictícia 900007 no Neon isolado.
// Não oferece endpoint público e não aceita protocolos reais.
export function criarGravadorSintetico900007({consultarNeon}={}){
 if(typeof consultarNeon!=='function')throw Error('Consulta Neon obrigatória');
 return async function gravar({protocolo,referenciaOperador,registroId,identidadeVerificada,evidenciaConferida,status}={}){
  if(protocolo!=='LEGADO-EMISSAO-TESTE-900007'||
   referenciaOperador!=='OP-TESTE-900007'||
   registroId!=='REG-TESTE-900007'||
   identidadeVerificada!==true||evidenciaConferida!==true||status!=='aprovado')
   throw Error('Fora do escopo da homologação 900007');
  const resposta=await consultarNeon(
   'SELECT mandato_testes.registrar_decisao_sintetica_900007($1,$2,$3) AS id',
   [protocolo,referenciaOperador,registroId]
  );
  const linhas=Array.isArray(resposta)?resposta:resposta?.rows;
  if(!Array.isArray(linhas)||linhas.length!==1||!/^\\d+$/.test(String(linhas[0]?.id))||
   BigInt(linhas[0].id)<1n)throw Error('Resposta de gravação inválida');
  return {registroId,id:linhas[0].id};
 };
}
