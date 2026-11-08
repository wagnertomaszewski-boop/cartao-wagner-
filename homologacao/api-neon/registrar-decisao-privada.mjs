// Registro de decisão de homologação: exige autorização do operador vinculada
// à sessão e atestado independente de conferência. Não aceita flags do cliente.
// Nenhuma rota HTTP, credencial ou acesso a produção é criado.
export function criarRegistradorDecisaoPrivada({
 autorizarOperador,verificarEvidencia,registrarRpc,auditar,relogio=()=>Date.now()
}={}){
 if([autorizarOperador,verificarEvidencia,registrarRpc,auditar,relogio].some(f=>typeof f!=='function'))
  throw Error('Autorização, evidência, RPC e auditoria são obrigatórias');
 return async function registrar({protocolo,referenciaOperador,tokenOperador,registroId}={}){
  if(typeof protocolo!=='string'||!/^[A-Za-z0-9-]{1,40}$/.test(protocolo)||
   typeof referenciaOperador!=='string'||!/^OP-[A-Za-z0-9-]{4,40}$/.test(referenciaOperador)||
   typeof registroId!=='string'||!/^[A-Za-z0-9-]{8,80}$/.test(registroId))
   throw Error('Dados de decisão inválidos');
  let autorizado=false;
  try{autorizado=(await autorizarOperador({protocolo,referenciaOperador,tokenOperador}))===true;}
  catch{throw Error('Autorização indisponível');}
  if(!autorizado)throw Error('Operador não autorizado');
  // verificarEvidencia deve consultar uma fonte independente do solicitante,
  // e não ler identidadeVerificada/evidenciaConferida do payload.
  let evidencia;
  try{evidencia=await verificarEvidencia({protocolo,referenciaOperador,registroId});}
  catch{throw Error('Evidência independente indisponível');}
  if(!evidencia||evidencia.registroId!==registroId||
   evidencia.protocolo!==protocolo||evidencia.operador!==referenciaOperador||
   evidencia.verificada!==true||evidencia.identidadeConfirmada!==true)
   throw Error('Evidência independente não confirmada');
  const momento=relogio();
  if(!Number.isSafeInteger(momento)||!Number.isSafeInteger(evidencia.verificadaEmMs)||
   evidencia.verificadaEmMs>momento||momento-evidencia.verificadaEmMs>15*60*1000)
   throw Error('Evidência fora da validade');
  // Auditoria prévia obrigatória: se falhar, não grava aprovação.
  await auditar({evento:'decisao_identidade_autorizada',protocolo,referenciaOperador,registroId});
  return registrarRpc({
   protocolo,referenciaOperador,registroId,
   identidadeVerificada:true,evidenciaConferida:true,status:'aprovado'
  });
 };
}
