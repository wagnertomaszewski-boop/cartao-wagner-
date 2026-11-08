// Item 2: núcleo de emissão/revogação. Não expõe rotas HTTP nem acesso ao banco.
// Dependências de identidade, autorização, transação e auditoria são obrigatórias.
import {emitirChavePrivada} from './chaves-privadas.mjs';

const ID=/^[1-9][0-9]{0,15}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function criarGestorChavesPrivadas({confirmarIdentidade,autorizarOperador,transacionar,auditar}={}) {
 for(const [nome,funcao] of Object.entries({confirmarIdentidade,autorizarOperador,transacionar,auditar}))
  if(typeof funcao!=='function')throw Error('Dependência obrigatória: '+nome);
 async function executar({acao,solicitacaoId,operadorId,atestado,contexto}={}) {
  if(!['emitir','revogar'].includes(acao) || !ID.test(String(solicitacaoId)) || !UUID.test(String(operadorId)) ||
   typeof atestado!=='string' || atestado.length<16 || atestado.length>4096)
   throw Error('Dados inválidos');
  // Atestado e autorização são conferidos no servidor, nunca a partir de flags do navegador.
  const identidade=await confirmarIdentidade({solicitacaoId:String(solicitacaoId),atestado,contexto:{...contexto,acao}});
  if(identidade!==true)throw Error('Identidade não confirmada');
  const autorizado=await autorizarOperador({acao,solicitacaoId:String(solicitacaoId),operadorId,contexto});
  if(autorizado!==true)throw Error('Operador não autorizado');
  const gerada=acao==='emitir'?emitirChavePrivada():null;
  // Auditoria e gravação devem ocorrer na MESMA transação, com rollback integral.
  await transacionar(async(tx)=>{
   if(!tx || typeof tx.revogarAtiva!=='function' || typeof tx.inserirHash!=='function')
    throw Error('Transação sem operações seguras');
   const revogadas=await tx.revogarAtiva({solicitacaoId:String(solicitacaoId)});
   if(!Number.isSafeInteger(revogadas) || revogadas<0 || revogadas>1)
    throw Error('Estado de chave inconsistente');
   if(acao==='emitir')await tx.inserirHash({solicitacaoId:String(solicitacaoId),hash:gerada.hash,operadorId});
   await auditar({tx,acao,solicitacaoId:String(solicitacaoId),operadorId,revogadas});
  });
  // A chave em texto claro só sai após o COMMIT; jamais entra em logs ou auditoria.
  return acao==='emitir'?{chave:gerada.chave,emitida:true}:{revogada:true};
 }
 return Object.freeze({emitir:args=>executar({...args,acao:'emitir'}),revogar:args=>executar({...args,acao:'revogar'})});
}
