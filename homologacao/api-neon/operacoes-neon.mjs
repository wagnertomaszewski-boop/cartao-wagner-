// Adaptador de banco para HOMOLOGAÇÃO. Recebe executor seguro do servidor.
// Não contém credenciais, não cria conexão nem aceita SQL do navegador.
const somenteTexto = (valor, limite) => typeof valor === 'string' && valor.trim().length > 0 && valor.length <= limite;
export function criarOperacoesNeon({executarCidadao, executarAdmin} = {}) {
  if (typeof executarCidadao !== 'function' || typeof executarAdmin !== 'function')
    throw new Error('Executores autenticados do servidor são obrigatórios');
  return {
    async solicitar({dados}) {
      if (!somenteTexto(dados.protocolo, 40) || !somenteTexto(dados.whatsapp, 25))
        throw new Error('Dados inválidos');
      // A resposta é deliberadamente idêntica para protocolo existente ou não.
      await executarCidadao('SELECT mandato_testes.pedir_recuperacao($1,$2)', [dados.protocolo.trim(), dados.whatsapp.trim()]);
      return {mensagem:'Se os dados corresponderem, o pedido será analisado.'};
    },
    async consultar({dados}) {
      if (!somenteTexto(dados.protocolo, 40) || !somenteTexto(dados.chave, 128))
        throw new Error('Dados inválidos');
      const linhas = await executarCidadao('SELECT * FROM mandato_testes.consulta_segura($1,$2)', [dados.protocolo.trim(), dados.chave]);
      return {resultado:linhas};
    },
    async decidir({dados,pedidoId}) {
      if (!/^[1-9][0-9]{0,17}$/.test(pedidoId || '') || typeof dados.aprovar !== 'boolean' || dados.identidadeConfirmada !== true)
        throw new Error('Decisão não autorizada');
      const linhas = await executarAdmin('SELECT * FROM mandato_testes.decidir_recuperacao($1,$2)', [pedidoId, dados.aprovar]);
      return {resultado:linhas};
    }
  };
}
