// Composição de homologação: assinatura Ed25519 -> UID Supabase -> auditoria
// -> RPC restrita exclusivamente ao registro sintético 900007.
import {criarRegistroComConferenteIndependente} from './registro-com-conferente-independente.mjs';
import {criarGravadorSintetico900007} from './gravador-sintetico-900007.mjs';
export function criarRegistroSinteticoAssinado900007(config={}){
 const registrarRpc=criarGravadorSintetico900007({consultarNeon:config.consultarNeon});
 return criarRegistroComConferenteIndependente({...config,registrarRpc});
}
