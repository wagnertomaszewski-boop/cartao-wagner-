import {criarVerificacaoWhatsapp} from './verificacao-whatsapp.mjs';
import {prepararEnvioManualWhatsapp} from './envio-manual-whatsapp.mjs';
import {criarRepositorioDesafiosWhatsappNeon} from './repositorio-desafios-whatsapp-neon.mjs';
// Apenas composição interna do servidor: nenhum número ou código é recebido do navegador.
// buscarContatoConfirmado deve consultar contato previamente verificado do titular.
export function criarVerificacaoManualWhatsappNeon({pool,buscarContatoConfirmado,segredo,agora}={}){
 const persistencia=criarRepositorioDesafiosWhatsappNeon({pool});
 return criarVerificacaoWhatsapp({
  ...persistencia,buscarContatoConfirmado,segredo,agora,
  enviarCodigo:async({telefone,codigo,acao})=>({
   manual:true,...prepararEnvioManualWhatsapp({telefone,codigo,acao})
  })
 });
}
