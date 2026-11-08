// Prepara envio manual pelo WhatsApp comum. Não envia mensagens nem cobra API.
// A URL deve ser aberta somente após clique do operador autenticado.
// Nunca registrar codigo ou URL em logs, analytics, histórico de auditoria.
export function prepararEnvioManualWhatsapp({telefone,codigo,acao}={}){
 if(!/^\+55[1-9][0-9]{10}$/.test(String(telefone))||
    !/^[0-9]{6}$/.test(String(codigo))||
    !['emitir','revogar'].includes(acao))
  throw Error('Destino, código ou ação inválidos');
 const descricao=acao==='emitir'?'criação':'revogação';
 const mensagem='Mandato em Ação: seu código de confirmação para '+descricao+
  ' da chave de acompanhamento é '+codigo+
  '. Válido por 5 minutos. Não compartilhe este código com terceiros. Se não solicitou, ignore.';
 return {url:'https://wa.me/'+telefone.slice(1)+'?text='+encodeURIComponent(mensagem),telefoneMascarado:telefone.slice(0,5)+'*****'+telefone.slice(-4)};
}
