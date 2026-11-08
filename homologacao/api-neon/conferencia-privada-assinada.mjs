// O comprovante só pode nascer após conferência independente executada no servidor.
// Não aceita identidadeConferida do navegador; não contém documento pessoal no token.
import {randomBytes} from 'node:crypto';
import {criarEmissorComprovanteAssinado} from './comprovante-assinado.mjs';
export function criarConferenciaPrivadaAssinada({
 conferirIdentidade,segredo,relogio,gerarNonce=()=>randomBytes(16).toString('hex'),
 auditarConferencia
}={}){
 if(typeof conferirIdentidade!=='function'||typeof auditarConferencia!=='function')
  throw Error('Conferência e auditoria independentes obrigatórias');
 const emitir=criarEmissorComprovanteAssinado({segredo,relogio,gerarNonce});
 return async function conferirEAssinar({protocolo,referenciaOperador}={}){
  if(typeof protocolo!=='string'||!protocolo.trim()||protocolo.trim()!==protocolo||protocolo.length>40)
   throw Error('Protocolo inválido');
  if(typeof referenciaOperador!=='string'||!/^OP-[A-Za-z0-9-]{4,40}$/.test(referenciaOperador))
   throw Error('Referência interna de operador obrigatória');
  // A função confiável decide; nenhuma confirmação fornecida pelo chamador é aceita.
  let aprovado=false;
  try{aprovado=(await conferirIdentidade({protocolo,referenciaOperador}))===true;}
  catch{throw Error('Conferência independente indisponível');}
  if(!aprovado)throw Error('Identidade não confirmada');
  // Auditoria obrigatória antes de assinar, sem registrar comprovante ou documento.
  await auditarConferencia({evento:'identidade_conferida',protocolo,referenciaOperador});
  return emitir({protocolo,identidadeConferida:true});
 };
}
