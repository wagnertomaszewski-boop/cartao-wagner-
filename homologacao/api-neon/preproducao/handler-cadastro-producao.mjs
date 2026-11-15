// Rota de cadastro para servidor privado de produção; não habilitar em /hml.
// O proxy deve aplicar CORS allowlist, rate limit por IP, limite de corpo e upload privado.
import { criarRepositorioChavesProducao } from './repositorio-chaves-producao.mjs';
export function criarHandlerCadastroProducao({pool,segredoServidor}) {
 const repositorio=criarRepositorioChavesProducao({pool,segredoServidor});
 return async function cadastrar({metodo,corpo}={}) {
  const cabecalhos={'cache-control':'no-store','content-type':'application/json; charset=utf-8'};
  if(metodo!=='POST')return {status:405,cabecalhos,corpo:{erro:'Método não permitido'}};
  if(!corpo||typeof corpo!=='object'||Array.isArray(corpo))return {status:400,cabecalhos,corpo:{erro:'Dados inválidos'}};
  const campos=['nome','whatsapp','localidade','assunto','descricao'];
  if(campos.some(k=>typeof corpo[k]!=='string'||!corpo[k].trim()||corpo[k].length>3000) ||
    !Array.isArray(corpo.anexos??[]) || (corpo.anexos??[]).length>10)
    return {status:400,cabecalhos,corpo:{erro:'Dados inválidos'}};
  try {
   const resultado=await repositorio.cadastrarComChave({
    nome:corpo.nome,whatsapp:corpo.whatsapp,localidade:corpo.localidade,
    assunto:corpo.assunto,descricao:corpo.descricao,anexos:corpo.anexos??[],
    latitude:corpo.latitude??null,longitude:corpo.longitude??null
   });
   return {status:201,cabecalhos,corpo:resultado};
  } catch {
   return {status:503,cabecalhos,corpo:{erro:'Não foi possível registrar a solicitação'}};
  }
 };
}
