// Consulta somente decisões de identidade em uma RPC privada e restrita.
// A RPC deverá ser criada após autorização expressa no banco isolado.
// Não concede permissões, não executa DDL e não acessa dados reais.
const SQL='SELECT protocolo, operador, identidade_verificada AS "identidadeVerificada", evidencia_conferida AS "evidenciaConferida", status, registro_id AS "registroId", decidido_em_ms AS "decididoEmMs" FROM mandato_testes.consultar_decisao_identidade_privada($1,$2)';
export function criarFonteDecisaoNeon({consultar}={}){
 if(typeof consultar!=='function')throw Error('Consulta privada Neon obrigatória');
 return async function consultarDecisao({protocolo,referenciaOperador}={}){
  if(typeof protocolo!=='string'||!/^[A-Za-z0-9-]{1,40}$/.test(protocolo)||
   typeof referenciaOperador!=='string'||!/^OP-[A-Za-z0-9-]{4,40}$/.test(referenciaOperador))
   throw Error('Parâmetros privados inválidos');
  const linhas=await consultar(SQL,[protocolo,referenciaOperador]);
  if(!Array.isArray(linhas)||linhas.length!==1||!linhas[0]||typeof linhas[0]!=='object')
   throw Error('Decisão privada indisponível ou ambígua');
  return linhas[0];
 };
}
