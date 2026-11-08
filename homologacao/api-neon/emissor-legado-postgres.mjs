// Montagem EXCLUSIVAMENTE interna da emissão de homologação.
// Não criar rota HTTP para este serviço. Identidade deve ser validada
// independentemente por operador confiável, nunca pelo corpo do navegador.
import {criarEmissorLegado} from './emissao-legada-interna.mjs';
import {criarRepositorioChavesLegadas} from './repositorio-chaves-legadas.mjs';
import {criarTransacionarPostgres} from './transacao-postgres.mjs';

export function criarEmissorLegadoPostgres({pool,verificarIdentidade,auditarTentativa}={}){
 if(typeof verificarIdentidade!=='function'||typeof auditarTentativa!=='function')
  throw Error('Verificação independente e auditoria obrigatórias');
 const repositorio=criarRepositorioChavesLegadas({
  transacionar:criarTransacionarPostgres(pool)
 });
 return criarEmissorLegado({
  verificarIdentidade,
  persistirHash:dados=>repositorio.persistirHash(dados),
  // A tentativa é registrada antes da persistência. O evento de emissão
  // concluída é gravado atomicamente pelo repositório PostgreSQL.
  auditar:auditarTentativa
 });
}
