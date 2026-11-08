// Composição privada entre fonte legada Supabase (somente leitura) e Neon.
// NÃO criar rota HTTP. A fonte Supabase e a conferência do comprovante devem
// ser fornecidas pelo operador autorizado, com credenciais só no servidor.
import {criarBuscaVinculoSupabase} from './buscar-vinculo-supabase.mjs';
import {criarEmissorAssistidoPostgres} from './emissor-assistido-postgres.mjs';
export function criarEmissorComVinculoLegado({
 poolNeon,consultarSupabasePrivado,validarComprovante,auditarTentativa
}={}){
 if(typeof consultarSupabasePrivado!=='function')
  throw Error('Consulta privada da fonte legada obrigatória');
 if(typeof validarComprovante!=='function')
  throw Error('Conferência independente do comprovante obrigatória');
 return criarEmissorAssistidoPostgres({
  pool:poolNeon,
  buscarVinculo:criarBuscaVinculoSupabase({consultar:consultarSupabasePrivado}),
  validarComprovante,
  auditarTentativa
 });
}
