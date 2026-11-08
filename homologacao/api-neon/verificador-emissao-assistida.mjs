import {criarVerificadorVinculoLegado} from './verificar-vinculo-legado.mjs';
import {criarValidacaoAprovacaoManual} from './aprovacao-manual-legada.mjs';
// Composição para emissão assistida: comprovante, vínculo independente e aprovação
// registrada pelo operador. Não expõe rota pública nem aprova pedidos automaticamente.
export function criarVerificadorEmissaoAssistida({buscarVinculo,validarComprovante,consultarAprovacao}={}){
 const verificarVinculo=criarVerificadorVinculoLegado({buscarVinculo,validarComprovante});
 const validarAprovacao=criarValidacaoAprovacaoManual({consultar:consultarAprovacao});
 return async dados=>{
  const vinculo=await verificarVinculo(dados);
  if(!vinculo)return false;
  return await validarAprovacao({solicitacaoId:vinculo.solicitacaoId})?vinculo:false;
 };
}
