// PROTÓTIPO DE VERIFICADOR INDEPENDENTE. NÃO USAR EM PRODUÇÃO.
// Não envia WhatsApp sozinho, não expõe rotas e não conversa com o Supabase.
// O transporte, a autorização administrativa e o armazenamento persistente
// PRECISAM ser injetados por um serviço isolado e confiável.
// O código secreto nunca é devolvido ao requisitante nem persistido em claro.
import {createHmac,createPrivateKey,createPublicKey,randomInt,randomUUID,sign} from 'node:crypto';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TELEFONE_ANTIGO=/^\+55[1-9]\d{9,10}$/;
const CELULAR_NOVO=/^\+55[1-9]\d{10}$/;
const PREFIXO=Buffer.from('mandato-posse-contato-v1\0','utf8');
const ERRO='Verificação indisponível ou não autorizada.';
const PRAZO_MS=300000;

function contextoValido(c,verificadorId){
 return c&&typeof c==='object'&&!Array.isArray(c)&&
 UUID.test(c.pedidoId||'')&&UUID.test(c.operadorId||'')&&
 c.operadorId!==verificadorId&&/^[1-9]\d{0,15}$/.test(String(c.solicitacaoId))&&
 TELEFONE_ANTIGO.test(c.telefoneOriginal||'')&&CELULAR_NOVO.test(c.telefoneNovo||'')&&
 c.telefoneOriginal!==c.telefoneNovo;
}
function identidadeConfiavel(x){
 return typeof x==='string'&&UUID.test(x);
}
function chavePrivada(valor){
 return valor?.type==='private'?valor:createPrivateKey(valor);
}
function hashCodigo(segredo,id,codigo){
 return createHmac('sha256',segredo).update('posse-contato-v1\0'+id+'\0'+codigo).digest();
}

/**
 * Este módulo NÃO autentica requisições HTTP.
 * buscarContextoAutorizado deve conferir, no SERVIDOR, a identidade do operador,
 * MFA recente, aprovação do pedido e vínculo dos dois telefones. O telefone novo
 * deve ser conferido por fonte independente, sem depender de checkbox do Painel.
 *
 * persistencia.criar deve ser atômica, limitar tentativas por destino e proibir
 * duplicação de pedido. persistencia.verificar deve consumir atomicamente
 * uma única tentativa e impedir replay, após o prazo ou 5 erros.
 *
 * @param {{
 *  chavePrivadaVerificador:any,verificadorId:string,segredoDesafios:string,
 *  buscarContextoAutorizado:Function,enviarDesafio:Function,
 *  persistencia:{criar:Function,verificar:Function,revogar:Function},
 *  registrarReciboPrivado:Function,relogio?:()=>number
 * }} config
 */
export function criarVerificadorPossePorDesafio({
 chavePrivadaVerificador,verificadorId,segredoDesafios,
 buscarContextoAutorizado,enviarDesafio,persistencia,registrarReciboPrivado,
 relogio=()=>Date.now()
}={}){
 if(!identidadeConfiavel(verificadorId)||typeof segredoDesafios!=='string'||
  Buffer.byteLength(segredoDesafios)<32||typeof relogio!=='function'||
  typeof buscarContextoAutorizado!=='function'||typeof enviarDesafio!=='function'||
  typeof registrarReciboPrivado!=='function'||!persistencia||
  ['criar','verificar','revogar'].some(n=>typeof persistencia[n]!=='function'))
  throw Error('Verificador independente incompleto');
 if(chavePrivadaVerificador?.type==='public')throw Error('Chave privada Ed25519 obrigatória');
 const privada=chavePrivada(chavePrivadaVerificador);
 if(privada.asymmetricKeyType!=='ed25519')throw Error('Chave privada Ed25519 obrigatória');

 return Object.freeze({
  async iniciar({pedidoId,operadorId}={}){
   if(!identidadeConfiavel(pedidoId)||!identidadeConfiavel(operadorId)||
     operadorId===verificadorId)throw Error(ERRO);
   // O callback é uma fonte privada: dados do navegador NUNCA são usados como prova.
   const c=await buscarContextoAutorizado({pedidoId,operadorId});
   if(!contextoValido(c,verificadorId)||c.pedidoId!==pedidoId||c.operadorId!==operadorId)
    throw Error(ERRO);
   const contexto=Object.freeze({pedidoId,solicitacaoId:String(c.solicitacaoId),operadorId,
    telefoneOriginal:c.telefoneOriginal,telefoneNovo:c.telefoneNovo});
   const agora=relogio();
   if(!Number.isSafeInteger(agora))throw Error(ERRO);
   const desafioId=randomUUID(),evidenciaId=randomUUID();
   const codigo=String(randomInt(1000000)).padStart(6,'0');
   const expiraEm=new Date(agora+PRAZO_MS).toISOString();
   const codigoVerificador=hashCodigo(segredoDesafios,desafioId,codigo);
   const registrado=await persistencia.criar({
    desafioId,evidenciaId,contexto,codigoVerificador,
    telefoneHash:createHmac('sha256',segredoDesafios).update('destino\0'+c.telefoneNovo).digest(),
    criadoEm:new Date(agora).toISOString(),expiraEm
   });
   if(registrado!==true)throw Error(ERRO);
   try{
    // Esta função precisa ser um provedor de entrega autenticado e auditável.
    // Na suíte de testes é somente uma caixa de saída em memória.
    const aceito=await enviarDesafio({desafioId,telefoneNovo:c.telefoneNovo,codigo,expiraEm});
    if(aceito!==true)throw Error('Transporte não confirmou aceitação.');
   }catch{
    await persistencia.revogar({desafioId});
    throw Error(ERRO);
   }
   return {desafioId,expiraEm}; // Nunca retorna código, telefone ou recibo.
  },
  async confirmar({desafioId,codigo}={}){
   if(!identidadeConfiavel(desafioId)||typeof codigo!=='string'||!/^\d{6}$/.test(codigo))
    return {confirmado:false};
   const agora=relogio();
   if(!Number.isSafeInteger(agora))return {confirmado:false};
   // A persistência faz a contagem e consumo de modo ATÔMICO; sem chave em claro.
   const confirmado=await persistencia.verificar({
    desafioId,codigoVerificador:hashCodigo(segredoDesafios,desafioId,codigo),
    confirmadoEm:new Date(agora).toISOString()
   });
   if(!confirmado?.contexto||!contextoValido(confirmado.contexto,verificadorId)||
     !identidadeConfiavel(confirmado.evidenciaId))return {confirmado:false};
   const c=confirmado.contexto;
   const dados={v:1,finalidade:'posse-independente-whatsapp',
    metodo:'desafio-confirmado-no-destino',evidenciaId:confirmado.evidenciaId,
    verificadorId,pedidoId:c.pedidoId,solicitacaoId:String(c.solicitacaoId),
    operadorId:c.operadorId,telefoneOriginal:c.telefoneOriginal,
    telefoneNovo:c.telefoneNovo,confirmadoEm:new Date(agora).toISOString()};
   const bytes=Buffer.from(JSON.stringify(dados),'utf8');
   const recibo=Object.freeze({
    payload:bytes.toString('base64url'),
    assinatura:sign(null,Buffer.concat([PREFIXO,bytes]),privada).toString('base64url')
   });
   // O recibo permanece EXCLUSIVAMENTE no serviço do conferente, nunca no navegador.
   const aceito=await registrarReciboPrivado({recibo,contexto:c});
   if(aceito!==true)throw Error('Registro privado do recibo indisponível.');
   return {confirmado:true};
  }
 });
}
