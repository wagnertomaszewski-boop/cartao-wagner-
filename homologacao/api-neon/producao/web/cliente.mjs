import {validarConfiguracaoPublica} from './configuracao.mjs';
// Formatos históricos: DDD + 8/9 dígitos, com ou sem o prefixo +55.
// Não deduz um novo número a partir de oito dígitos; o servidor controla a emissão.
export function normalizarTelefoneRecuperacao(valor){
 const bruto=String(valor??'').trim();
 if(bruto.startsWith('+')&&!bruto.startsWith('+55'))throw Error('Informe um número brasileiro com DDD.');
 const digitos=bruto.replace(/\D/g,'');
 const comPais=digitos.length===10||digitos.length===11?'55'+digitos:digitos;
 if(!/^55[1-9]\d{9,10}$/.test(comPais))throw Error('Informe o telefone cadastrado com DDD.');
 return '+'+comPais;
}

export function criarClienteWeb(config,buscar=fetch){
 const c=validarConfiguracaoPublica(config);
 async function enviar(rota,dados,token){const r=await buscar(c.apiBase+'/api/v1/'+rota,{method:'POST',credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(dados),signal:AbortSignal.timeout(25000)});if(!r.ok){if(token&&rota==='admin/recuperacao/emitir'&&r.status===409){let motivo=null;try{motivo=(await r.json())?.codigo;}catch{}if(motivo==='WHATSAPP_LEGADO_SEM_DESTINO')throw Error('Contato antigo sem destino WhatsApp confirmado. Não envie código; regularize o número mediante conferência de identidade e MFA.');}throw Error(r.status===429?'Limite de tentativas. Aguarde.':r.status===403?'Acesso não autorizado. Confira os dados ou renove o MFA.':'Não foi possível concluir. Tente novamente.');}return r.json();}
 return {
 cadastrar:d=>enviar('solicitacoes/cadastrar',d),
 consultar:d=>{if(!/^[A-Za-z0-9_-]{43}$/.test(d.chave||'')||!d.protocolo)throw Error('Informe protocolo e chave de acompanhamento.');return enviar('solicitacoes/consultar',d);},
 anexar:d=>enviar('arquivos/anexar',d),baixar:d=>enviar('arquivos/baixar',d),
 solicitar:d=>enviar('recuperacao/solicitar',{...d,telefone:normalizarTelefoneRecuperacao(d?.telefone)}),validar:d=>enviar('recuperacao/validar',d),
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
   if(typeof r.protocolo!=='string'||!r.protocolo||typeof r.novaChave!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(r.novaChave))throw Error('Resposta privada inválida. Confira o atendimento.');
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
