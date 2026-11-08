// Adaptador explícito da consulta com chave para a rota HTTP já existente.
// Não é carregado pelo servidor padrão e não habilita produção automaticamente.
import {criarConsultaComChave} from './consulta-chave-privada.mjs';
export function criarOperacaoHttpConsultaPrivada({executar}={}) {
 const consultarBanco=criarConsultaComChave({executar});
 return async function consultar({dados}={}) {
  if(!dados||typeof dados!=='object'||Array.isArray(dados))
   throw Error('Dados inválidos');
  const resultado=await consultarBanco({protocolo:dados.protocolo,chave:dados.chave});
  // Compatível com o contrato da API existente, sem retornar dados internos.
  return {resultado,respostas:[],historico:[],anexos:[]};
 };
}
