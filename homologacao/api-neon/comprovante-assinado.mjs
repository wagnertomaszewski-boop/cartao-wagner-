// Comprovante de verificação assinado pelo serviço interno, não pelo navegador.
// A assinatura prova apenas que o emissor confiável registrou uma conferência;
// não substitui a checagem documental/identidade realizada por fonte independente.
import {createHmac,timingSafeEqual} from 'node:crypto';
const versao='v1';
const valido=p=>typeof p==='string'&&p.trim()===p&&p.length>0&&p.length<=40;
const chaveValida=s=>Buffer.isBuffer(s)&&s.length>=32;
const assinatura=(secret,payload)=>createHmac('sha256',secret).update(payload).digest('hex');
export function criarVerificadorComprovanteAssinado({segredo,relogio=()=>Date.now(),janelaMs=15*60*1000}={}){
 if(!chaveValida(segredo)||typeof relogio!=='function'||!Number.isSafeInteger(janelaMs)||janelaMs<1)
  throw Error('Configuração privada inválida');
 return async function validarComprovante({protocolo,comprovante}={}){
  if(!valido(protocolo)||typeof comprovante!=='string'||comprovante.length>512)return false;
  const partes=comprovante.split('.');
  if(partes.length!==4||partes[0]!==versao||!/^[0-9]{13}$/.test(partes[1])||
   !/^[a-f0-9]{32}$/.test(partes[2])||!/^[a-f0-9]{64}$/.test(partes[3]))return false;
  const emitidoEm=Number(partes[1]),agora=relogio();
  if(!Number.isSafeInteger(emitidoEm)||!Number.isSafeInteger(agora)||emitidoEm>agora||
   agora-emitidoEm>janelaMs)return false;
  const payload=[versao,partes[1],partes[2],protocolo].join('.');
  const esperado=Buffer.from(assinatura(segredo,payload),'hex');
  return timingSafeEqual(esperado,Buffer.from(partes[3],'hex'));
 };
}
// Uso exclusivo do processo de verificação independente, após checagem real.
// Não conectar a um endpoint público ou emitir a partir de campos do cliente.
export function criarEmissorComprovanteAssinado({segredo,relogio=()=>Date.now(),gerarNonce}={}){
 if(!chaveValida(segredo)||typeof relogio!=='function'||typeof gerarNonce!=='function')
  throw Error('Emissor privado inválido');
 return function emitirComprovante({protocolo,identidadeConferida}={}){
  if(!valido(protocolo)||identidadeConferida!==true)throw Error('Conferência independente obrigatória');
  const agora=relogio(),nonce=gerarNonce();
  if(!Number.isSafeInteger(agora)||agora<1e12||agora>9999999999999||
   typeof nonce!=='string'||!/^[a-f0-9]{32}$/.test(nonce))throw Error('Emissão inválida');
  const payload=[versao,String(agora),nonce,protocolo].join('.');
  return [versao,String(agora),nonce,assinatura(segredo,payload)].join('.');
 };
}
