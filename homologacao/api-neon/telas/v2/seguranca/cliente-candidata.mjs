import {normalizarTelefoneRecuperacao,ativarMascaraTelefone} from '/hml/candidata/telefone.js';
export {ativarMascaraTelefone};
export function criarClienteCandidata(buscar){
 async function enviar(rota,dados){
  const r=await buscar('/hml/candidata/api/v1/'+rota,{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify(dados),signal:AbortSignal.timeout(20000)});
  const j=await r.json();
  if(!r.ok)throw Error(j.erro||'Operação indisponível.');
  return j;
 }
 const telefone=(valor,autorizado)=>{
  if(!valor?.trim())return '+5551000000000';
  const normalizado=normalizarTelefoneRecuperacao(valor);
  if(normalizado!=='+5551000000000'&&!autorizado)throw Error('Confirme a autorização para usar seu WhatsApp de teste.');
  return normalizado;
 };
 return {
  cadastrar:({ficticio,whatsappRealAutorizado,...d})=>{
   if(ficticio!==true)throw Error('Confirme que a solicitação contém somente dados fictícios.');
   return enviar('solicitacoes/cadastrar',{...d,p_whatsapp:telefone(d.p_whatsapp,whatsappRealAutorizado)});
  },
  anexar:d=>enviar('arquivos/anexar',d),
  baixar:d=>enviar('arquivos/baixar',d),
  consultar:d=>enviar('solicitacoes/consultar',d),
  solicitar:d=>enviar('recuperacao/solicitar',{protocolo:d.protocolo,telefone:telefone(d.telefone,d.autorizado)}),
  validar:async({codigo})=>{
   const r=await enviar('recuperacao/validar',{codigo});
   if(r.reciboAusente)throw Error('Pedido não encontrado neste navegador. Inicie uma nova recuperação.');
   return {...r,confirmado:r.validado===true};
  }
 };
}
