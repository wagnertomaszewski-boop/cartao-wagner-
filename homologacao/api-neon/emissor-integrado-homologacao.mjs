// Encadeamento privado para emissão de atestados; não expõe rota pública.
import {criarConferenteIdentidadeServidor} from './conferente-identidade-servidor.mjs';
import {criarConsultaWhatsappNeon} from './consulta-whatsapp-neon.mjs';
import {criarConsultaAprovacaoManualNeon} from './consulta-aprovacao-manual-neon.mjs';
import {criarEmissorAtestados} from './emissor-atestados-privado.mjs';
export function criarEmissorIntegradoHomologacao({
 poolLeitura,chavePrivadaPem,autorizarOperador,consultarReautenticacao,agora
}={}){
 if(typeof autorizarOperador!=='function'||typeof consultarReautenticacao!=='function')
  throw Error('Autorização e reautenticação privadas obrigatórias');
 const confirmarIdentidadeIndependente=criarConferenteIdentidadeServidor({
  consultarWhatsappConfirmado:criarConsultaWhatsappNeon({pool:poolLeitura}),
  consultarConferenciaPessoal:criarConsultaAprovacaoManualNeon({pool:poolLeitura}),
  consultarReautenticacao,agora
 });
 return criarEmissorAtestados({chavePrivadaPem,autorizarOperador,
  confirmarIdentidadeIndependente,agora});
}
