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
      if (!somenteTexto(dados.protocolo, 40) || !somenteTexto(dados.chave, 128) || dados.chave.trim().length < 32)
        throw new Error('Dados inválidos');
      const linhas = await executarCidadao('SELECT * FROM mandato_testes.consulta_segura($1,$2)', [dados.protocolo.trim(), dados.chave]);
      const respostas = linhas.length ? await executarCidadao('SELECT * FROM mandato_testes.consulta_respostas_segura($1,$2)', [dados.protocolo.trim(), dados.chave]) : [];
      const historico = linhas.length ? await executarCidadao('SELECT * FROM mandato_testes.consulta_historico_segura($1,$2)', [dados.protocolo.trim(), dados.chave]) : [];
      return {resultado:linhas.map(({assunto,status})=>({assunto,status})), respostas:respostas.map(({texto,criado_em})=>({texto,criado_em})), historico:historico.map(({status,observacao,criado_em})=>({status,observacao,criado_em}))};
    },
    async decidir({dados,pedidoId}) {
      if (!/^[1-9][0-9]{0,17}$/.test(pedidoId || '') || typeof dados.aprovar !== 'boolean')
        throw new Error('Decisão não autorizada');
      const linhas = await executarAdmin('SELECT * FROM mandato_testes.decidir_recuperacao($1,$2)', [pedidoId, dados.aprovar]);
      return {resultado:linhas};
    }
  };
}
