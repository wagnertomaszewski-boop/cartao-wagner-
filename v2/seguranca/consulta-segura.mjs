// Integração isolada para a V2. Não substitui a consulta antiga até a migração aprovada.
// Nunca armazene a chave de acesso em localStorage, URL, analytics ou logs.
export function criarConsultaSegura({apiBase, buscar=fetch}={}) {
  if (typeof apiBase !== 'string') throw Error('API de segurança não configurada');
  let url;
  try { url=new URL(apiBase); } catch { throw Error('Endereço da API inválido'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/')
    throw Error('A API segura exige origem HTTPS sem credenciais');
  const origem=url.origin;
  async function enviar(rota,dados) {
    const resposta=await buscar(origem+rota,{
      method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
      credentials:'omit',cache:'no-store',redirect:'error',body:JSON.stringify(dados)
    });
    if (!resposta.ok) throw Error('Não foi possível concluir a operação. Tente novamente.');
    return resposta.json();
  }
  return {
    async consultar({protocolo,chave}={}) {
      const p=typeof protocolo==='string'?protocolo.trim():'';
      const c=typeof chave==='string'?chave.trim():'';
      if(!p || !c || c.length<32) throw Error('Informe o protocolo e a chave de acesso completa.');
      return enviar('/api/solicitacoes/consultar',{protocolo:p,chave:c});
    },
    async pedirRecuperacao({protocolo,whatsapp}={}) {
      const p=typeof protocolo==='string'?protocolo.trim():'';
      const w=typeof whatsapp==='string'?whatsapp.replace(/\D/g,''):'';
      if(!p || w.length<10 || w.length>13) throw Error('Informe o protocolo e o WhatsApp com DDD.');
      return enviar('/api/recuperacao/solicitar',{protocolo:p,whatsapp:w});
    }
  };
}
