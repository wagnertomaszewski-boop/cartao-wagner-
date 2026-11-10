import {validarConfiguracaoPublica} from './configuracao.mjs';
export function criarClienteWeb(config,buscar=fetch){
 const c=validarConfiguracaoPublica(config);
 async function enviar(rota,dados,token){const r=await buscar(c.apiBase+'/api/v1/'+rota,{method:'POST',credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(dados),signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error(r.status===429?'Limite de tentativas. Aguarde.':r.status===403?'Acesso não autorizado. Confira os dados ou renove o MFA.':'Não foi possível concluir. Tente novamente.');return r.json();}
 return {
 cadastrar:d=>enviar('solicitacoes/cadastrar',d),
 consultar:d=>{if(!/^[A-Za-z0-9_-]{43}$/.test(d.chave||'')||!d.protocolo)throw Error('Informe protocolo e chave de acompanhamento.');return enviar('solicitacoes/consultar',d);},
 anexar:d=>enviar('arquivos/anexar',d),baixar:d=>enviar('arquivos/baixar',d),
 solicitar:d=>enviar('recuperacao/solicitar',d),validar:d=>enviar('recuperacao/validar',d),
 admin:(acao,d,token)=>{if(!['listar','decidir','emitir','confirmar-envio'].includes(acao)||!token)throw Error('Sessão administrativa obrigatória.');return enviar('admin/recuperacao/'+acao,d,token);}
 };
}
