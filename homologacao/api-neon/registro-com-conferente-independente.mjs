// Montagem fechada do registro: somente atestado de conferente externo
// com assinatura válida pode autorizar a RPC de decisão.
import {criarFonteEvidenciaAssinada} from './fonte-evidencia-assinada.mjs';
import {criarRegistroDecisaoAutenticado} from './registro-decisao-autenticado.mjs';
export function criarRegistroComConferenteIndependente({
 chavePublicaConferente,buscarAtestado,...config
}={}){
 const verificarEvidencia=criarFonteEvidenciaAssinada({
  chavePublicaConferente,buscarAtestado,relogio:config.relogio
 });
 return criarRegistroDecisaoAutenticado({...config,verificarEvidencia});
}
