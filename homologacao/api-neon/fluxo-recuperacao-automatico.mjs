// Orquestração isolada para homologação. Não expõe rotas HTTP, não altera pedidos
// e não fornece credenciais de acesso. Dependências só podem vir do servidor.
export function criarFluxoRecuperacaoAutomatico({
  localizarContatoVerificado, enviarCodigo, desafios, registrarAuditoria=async()=>{}
}={}) {
  if(typeof localizarContatoVerificado!=='function' ||
     typeof enviarCodigo!=='function' ||
     typeof desafios?.emitir!=='function' ||
     typeof desafios?.confirmar!=='function' ||
     typeof desafios?.invalidar!=='function' ||
     typeof registrarAuditoria!=='function') throw Error('Dependências obrigatórias ausentes');
  const respostaPublica={mensagem:'Se os dados permitirem, enviaremos instruções de recuperação.'};
  return {
    async solicitar({protocolo}={}) {
      // Resposta pública uniforme para evitar enumeração de protocolos.
      if(typeof protocolo!=='string'||protocolo.length<1||protocolo.length>128) return {...respostaPublica};
      let contato;
      try { contato=await localizarContatoVerificado(protocolo); }
      catch { return {...respostaPublica}; }
      if(!contato || contato.verificado!==true ||
         typeof contato.pedidoId!=='string' || !contato.pedidoId ||
         typeof contato.destino!=='string' || !contato.destino) return {...respostaPublica};
      let codigo;
      try {
        codigo=desafios.emitir(contato.pedidoId);
        await enviarCodigo({destino:contato.destino,codigo});
        await registrarAuditoria({evento:'desafio_enviado',pedidoId:contato.pedidoId});
      } catch {
        desafios.invalidar(contato.pedidoId);
        return {...respostaPublica};
      }
      return {...respostaPublica};
    },
    // O identificador do pedido deve ser resolvido no servidor após autenticação
    // independente do solicitante. Não ligar diretamente a um protocolo público.
    confirmarInternamente({pedidoId,codigo}={}) {
      return desafios.confirmar(pedidoId,codigo);
    }
  };
}
