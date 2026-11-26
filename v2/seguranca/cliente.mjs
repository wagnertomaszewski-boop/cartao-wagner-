import {validarConfiguracaoPublica} from './configuracao.mjs?v=2be3d5035235f04175e7e8f3965112cec6d5fa28';
import {normalizarTelefoneRecuperacao} from './telefone.mjs?v=2be3d5035235f04175e7e8f3965112cec6d5fa28';
export {normalizarTelefoneRecuperacao} from './telefone.mjs?v=2be3d5035235f04175e7e8f3965112cec6d5fa28';

export function criarClienteWeb(config,buscar=fetch){
 const c=validarConfiguracaoPublica(config);
 async function enviar(rota,dados,token){const r=await buscar(c.apiBase+'/api/v1/'+rota,{method:'POST',credentials:rota.startsWith('recuperacao/navegador/')?'include':'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(dados),signal:AbortSignal.timeout(rota.startsWith('arquivos/')?90000:25000)});if(!r.ok){if(token&&rota==='admin/recuperacao/emitir'&&r.status===409){let motivo=null;try{motivo=(await r.json())?.codigo;}catch{}if(motivo==='WHATSAPP_LEGADO_SEM_DESTINO')throw Error('Contato antigo sem destino WhatsApp confirmado. Não envie código; regularize o número mediante conferência de identidade e MFA.');}throw Error(r.status===413?'O arquivo ultrapassou o limite de 10 MB.':r.status===429?'Limite de tentativas. Aguarde.':r.status===403?'Acesso não autorizado. Confira os dados ou renove o MFA.':'Não foi possível concluir. Tente novamente.');}return r.json();}
 return {
 cadastrar:d=>enviar('solicitacoes/cadastrar',{...d,formatoChave:12,p_whatsapp:normalizarTelefoneRecuperacao(d.p_whatsapp)}),
 consultar:d=>{if(!/^(?:[A-Za-z0-9]{12}|[A-Za-z0-9_-]{43})$/.test(d.chave||'')||!d.protocolo)throw Error('Informe protocolo e chave de acompanhamento.');return enviar('solicitacoes/consultar',d);},
 anexar:d=>enviar('arquivos/anexar',d),baixar:d=>enviar('arquivos/baixar',d),
 solicitar:d=>enviar('recuperacao/solicitar',{...d,telefone:normalizarTelefoneRecuperacao(d?.telefone)}),validar:d=>enviar('recuperacao/validar',{...d,formatoChave:12}),
 solicitarNavegador:d=>enviar('recuperacao/navegador/solicitar',{protocolo:d.protocolo,telefone:normalizarTelefoneRecuperacao(d.telefone)}),
 validarNavegador:codigo=>enviar('recuperacao/navegador/validar',{codigo,formatoChave:12}),
 validarSessaoAdmin:token=>{if(!token)throw Error('Sessão administrativa obrigatória.');return enviar('admin/sessao/validar',{},token);},
 admin:(acao,d,token)=>{if(!['listar','decidir','regularizar-contato','emitir','confirmar-envio'].includes(acao)||!token)throw Error('Sessão administrativa obrigatória.');return enviar('admin/recuperacao/'+acao,d,token);}
 };
}

/**
 * Contrato de RECUPERAÇÃO para a futura tela do cidadão.
 * Não altera a entrada HML nem executa solicitações sem uma API privada configurada.
 * QR, biometria, confirmação de leitura e o Painel exigem integrações separadas.
 */
export function criarContratoRecuperacaoCidadao(cliente){
 if(!cliente||!['consultar','solicitar','validar'].every(k=>typeof cliente[k]==='function'))throw Error('API de recuperação privada indisponível.');
 return Object.freeze({
  solicitar:entrada=>cliente.solicitar(entrada),
  validar:async entrada=>{
   const r=await cliente.validar(entrada);
   if(r?.validado!==true)return {confirmado:false};
   if(typeof r.protocolo!=='string'||!r.protocolo||typeof r.novaChave!=='string'||!/^(?:[A-Za-z0-9]{12}|[A-Za-z0-9_-]{43})$/.test(r.novaChave))throw Error('Resposta privada inválida. Confira o atendimento.');
   return {confirmado:true,protocolo:r.protocolo,novaChave:r.novaChave};
  },
  consultar:async entrada=>{
   const r=await cliente.consultar(entrada);
   if(r?.encontrado!==true)return {encontrado:false};
   return {
    encontrado:true,protocolo:r.protocolo,assunto:r.assunto,
    descricao:r.descricao,localidade:r.localidade,status:r.status,
    criadoEm:r.criadoEm,atualizadoEm:r.atualizadoEm,
    historico:Array.isArray(r.historico)?r.historico.map(x=>({status:x.status,criadoEm:x.criadoEm||x.criado_em})):[],
    respostas:Array.isArray(r.respostas)?r.respostas.map(x=>({mensagem:x.mensagem,criadoEm:x.criadoEm||x.criado_em,anexos:[]})):[],
    anexos:Array.isArray(r.anexos)?r.anexos:[]
   };
  }
 });
}
