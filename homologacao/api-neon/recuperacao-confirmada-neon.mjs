// Recuperação exige atestado de identidade assinado, operador autorizado
// e comprovante OTP consumível. A RPC faz troca+auditoria na mesma transação.
import {criarVerificadorAtestadoIdentidade} from './verificar-atestado-identidade.mjs';
import {emitirChavePrivada} from './chaves-privadas.mjs';
export function criarRecuperacaoConfirmada({pool,chavePublicaPem,operadorPermitido,agora}={}){
 if(typeof pool?.query!=='function'||typeof operadorPermitido!=='function')throw Error('Integrações privadas obrigatórias');
 const verificar=criarVerificadorAtestadoIdentidade({chavePublicaPem,agora,consumirNonce:async()=>true});
 return async function recuperar({solicitacaoId,operadorId,desafioId,atestado}={}){
  if(!/^[1-9][0-9]{0,15}$/.test(String(solicitacaoId))||typeof desafioId!=='string'||!/^[a-f0-9]{32}$/.test(desafioId))throw Error('Dados inválidos');
  if(await operadorPermitido({operadorId,acao:'emitir',solicitacaoId:String(solicitacaoId)})!==true)throw Error('Operador não autorizado');
  if(await verificar({solicitacaoId,atestado,contexto:{acao:'emitir'}})!==true)throw Error('Identidade não confirmada');
  const p=JSON.parse(Buffer.from(atestado.split('.')[0],'base64url').toString('utf8'));
  if(p.operadorId?.toLowerCase()!==String(operadorId).toLowerCase())throw Error('Operador divergente');
  const chave=emitirChavePrivada();
  const r=await pool.query('SELECT revogadas,auditorias FROM mandato_chaves_homologacao.aplicar_recuperacao_confirmada($1,$2::bigint,$3::uuid,$4::bytea,$5,to_timestamp($6::double precision/1000.0))',[desafioId,String(solicitacaoId),operadorId,chave.hash,p.nonce,p.expiraEm]);
  if(r.rowCount!==1||r.rows[0].auditorias!==1)throw Error('Recuperação não auditada');
  return {chave:chave.chave,emitida:true,revogadas:Number(r.rows[0].revogadas)};
 };
}
