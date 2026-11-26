import {normalizarTelefoneRecuperacao} from './telefone.mjs';

export function criarClienteWeb(){
 const base='/hml/candidata/api/v1/';
 async function enviar(rota,dados){
  const r=await fetch(base+rota,{
   method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',
   headers:{'Content-Type':'application/json'},body:JSON.stringify(dados),
   signal:AbortSignal.timeout(rota.startsWith('arquivos/')?90000:25000)
  });
  if(!r.ok)throw Error(r.status===413?'O arquivo ultrapassou 10 MB.':r.status===429?'Aguarde antes de tentar novamente.':'Operação indisponível. Confira os dados e tente novamente.');
  return r.json();
 }
 const telefone=valor=>normalizarTelefoneRecuperacao(valor);
 return {
  cadastrar:d=>enviar('solicitacoes/cadastrar',{...d,p_whatsapp:telefone(d.p_whatsapp)}),
  consultar:d=>{
   if(!d.protocolo||!/^[A-Za-z0-9_-]{43}$/.test(d.chave))throw Error('Informe protocolo e chave de acompanhamento.');
   return enviar('solicitacoes/consultar',d);
  },
  anexar:d=>enviar('arquivos/anexar',d),
  baixar:d=>enviar('arquivos/baixar',d),
  solicitarNavegador:d=>enviar('recuperacao/solicitar',{protocolo:d.protocolo,telefone:telefone(d.telefone)}),
  validarNavegador:codigo=>enviar('recuperacao/validar',{codigo})
 };
}
