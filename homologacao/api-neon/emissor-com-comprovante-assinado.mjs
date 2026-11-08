// Integração de comprovante HMAC ao emissor privado.
// O token é gerado SOMENTE após verificação independente externa.
// Não criar rota pública e não armazenar o segredo no navegador.
import {criarVerificadorComprovanteAssinado} from './comprovante-assinado.mjs';
import {criarEmissorComVinculoLegado} from './emissor-com-vinculo-legado.mjs';
export function criarEmissorComComprovanteAssinado({
 poolNeon,consultarSupabasePrivado,segredoComprovante,relogio,auditarTentativa
}={}){
 const validarComprovante=criarVerificadorComprovanteAssinado({
  segredo:segredoComprovante,relogio
 });
 return criarEmissorComVinculoLegado({
  poolNeon,consultarSupabasePrivado,validarComprovante,auditarTentativa
 });
}
