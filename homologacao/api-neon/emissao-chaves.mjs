// Serviço de emissão isolado: sem rota HTTP e sem conexão de produção.
// Confirmação de identidade é obtida EXCLUSIVAMENTE no servidor.
import {emitirChavePrivada} from './chaves-privadas.mjs';

const ID=/^[1-9][0-9]{0,17}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function criarEmissorChaves({verificarIdentidade,autorizarEmissao,gravarHash}={}) {
 if([verificarIdentidade,autorizarEmissao,gravarHash].some(fn=>typeof fn!=='function'))
  throw Error('Verificadores e gravador do servidor são obrigatórios');
 return Object.freeze({
  async emitir({solicitacaoId,operadorId,contextoServidor}={}) {
   if(typeof solicitacaoId!=='string'||!ID.test(solicitacaoId)||typeof operadorId!=='string'||!UUID.test(operadorId)||!contextoServidor)
    throw Error('Parâmetros inválidos');
   // Verificações independentes e fechadas por padrão; valores do navegador não são provas.
   const identidade=await verificarIdentidade({solicitacaoId,operadorId,contextoServidor});
   if(identidade!==true)throw Error('Emissão não autorizada');
   const permissao=await autorizarEmissao({solicitacaoId,operadorId,contextoServidor});
   if(permissao!==true)throw Error('Emissão não autorizada');
   const {chave,hash}=emitirChavePrivada();
   // Gravação deve ser transacional, com controle de unicidade e auditoria no banco.
   // Não devolver chave se o armazenamento falhar.
   const gravada=await gravarHash({solicitacaoId,operadorId,hash});
   if(gravada!==true)throw Error('Emissão não concluída');
   return {chave};
  }
 });
}
