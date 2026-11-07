import {criarServidor} from './server.mjs';
import {criarOperacoesNeon} from './operacoes-neon.mjs';
import {criarExecutoresPostgres} from './executores-postgres.mjs';

// Inicialização de homologação local: NÃO habilita administração sem verificador real.
// DATABASE_URL é segredo do servidor. Nunca incluir no frontend ou no GitHub.
export async function iniciarHomologacao({env=process.env, carregarPg=()=>import('pg')}={}) {
 if (env.MANDATO_AMBIENTE !== 'homologacao') throw Error('Ambiente de homologação obrigatório');
 if (env.HABILITAR_API_NEON !== 'sim') throw Error('API desabilitada por padrão');
 if (env.AUTENTICACAO_ADMIN_CONFIGURADA === 'sim') throw Error('Flag não substitui verificador administrativo real');
 if (!env.DATABASE_URL || !/^postgres(?:ql)?:\/\//.test(env.DATABASE_URL)) throw Error('DATABASE_URL do servidor obrigatória');
 const {default:pg} = await carregarPg();
 const pool = new pg.Pool({connectionString:env.DATABASE_URL,ssl:{rejectUnauthorized:true},max:3,connectionTimeoutMillis:3000,idleTimeoutMillis:10000});
 const {executarCidadao,executarAdmin}=criarExecutoresPostgres({pool});
 const operacoes=criarOperacoesNeon({executarCidadao,executarAdmin});
 // Sem autenticação de administrador integrada, o verificador sempre rejeita.
 const servidor=criarServidor({operacoes,verificarAdmin:async()=>false});
 return {servidor,fechar:async()=>{await new Promise(resolve=>servidor.close(resolve));await pool.end();}};
}
