// Serviço interno de homologação: NÃO expor diretamente em rotas HTTP.
// A identidade é validada por função confiável do servidor, não por campo do cliente.
import {prepararChaveLegada} from './chaves-legadas-homologacao.mjs';
export function criarEmissorLegado({verificarIdentidade,persistirHash,auditar}={}){
 if([verificarIdentidade,persistirHash,auditar].some(fn=>typeof fn!=='function'))
  throw Error('Verificação, persistência e auditoria do servidor obrigatórias');
 return {
  async emitir({protocolo,comprovante}={}){
   if(typeof protocolo!=='string'||!protocolo.trim()||protocolo.length>40)
    throw Error('Protocolo inválido');
   // Não aceitar identidadeVerificada, admin ou autorização do corpo do navegador.
   const confirmado=await verificarIdentidade({protocolo:protocolo.trim(),comprovante});
   if(!confirmado || !Number.isSafeInteger(confirmado.solicitacaoId) || confirmado.solicitacaoId<=0)throw Error('Identidade não confirmada');
   const emissao=prepararChaveLegada({protocolo,identidadeVerificada:true});
   // Persistir somente o hash, nunca a chave. A operação deve ser transacional
   // e ter controle de unicidade no adaptador real, ainda não implementado.
   await persistirHash({protocolo:emissao.protocolo,hash:emissao.hash,solicitacaoId:confirmado.solicitacaoId});
   await auditar({evento:'chave_legada_emitida',protocolo:emissao.protocolo});
   return {protocolo:emissao.protocolo,chave:emissao.chave};
  }
 };
}
