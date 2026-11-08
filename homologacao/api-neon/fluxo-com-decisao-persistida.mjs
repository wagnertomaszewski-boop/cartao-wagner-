// Montagem fechada: não permite callback arbitrário de decisão manual.
// Apenas a fonte RPC privada do Neon pode fornecer a decisão auditada.
import {criarFonteDecisaoNeon} from './fonte-decisao-neon.mjs';
import {criarFluxoComDecisaoManual} from './fluxo-com-decisao-manual.mjs';
export function criarFluxoComDecisaoPersistida({consultarNeon,...config}={}){
 const consultarDecisao=criarFonteDecisaoNeon({consultar:consultarNeon});
 return criarFluxoComDecisaoManual({...config,consultarNeon,consultarDecisao});
}
