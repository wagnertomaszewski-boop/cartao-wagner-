// Composição privada: assinatura + vínculo confiável + aprovação + RPC fictícia.
// Não expor rota HTTP. Somente para registros 900004/900005 em homologação.
import {criarEmissorLegado} from './emissao-legada-interna.mjs';
import {criarVerificadorEmissaoAssistida} from './verificador-emissao-assistida.mjs';
import {criarVerificadorComprovanteAssinado} from './comprovante-assinado.mjs';
import {criarBuscaVinculoSupabase} from './buscar-vinculo-supabase.mjs';
import {criarPersistenciaRpcFicticia} from './persistencia-rpc-ficticia.mjs';
export function criarEmissorRpcFicticio({
 consultarNeon,consultarSupabasePrivado,segredoComprovante,
 auditarTentativa,relogio
}={}){
 if(typeof consultarNeon!=='function'||typeof consultarSupabasePrivado!=='function')
  throw Error('Consultas privadas obrigatórias');
 const verificarIdentidade=criarVerificadorEmissaoAssistida({
  buscarVinculo:criarBuscaVinculoSupabase({consultar:consultarSupabasePrivado}),
  validarComprovante:criarVerificadorComprovanteAssinado({segredo:segredoComprovante,relogio}),
  consultarAprovacao:consultarNeon
 });
 return criarEmissorLegado({
  verificarIdentidade,
  persistirHash:criarPersistenciaRpcFicticia({consultar:consultarNeon}),
  auditar:auditarTentativa
 });
}
