import {criarServidor} from './server.mjs';
import {criarVerificadorAdmin} from './verificar-admin-supabase.mjs';
import {criarOperacoesNeon} from './operacoes-neon.mjs';
import {criarExecutoresPostgres} from './executores-postgres.mjs';

// Inicialização de homologação local: NÃO habilita administração sem verificador real.
// DATABASE_URL é segredo do servidor. Nunca incluir no frontend ou no GitHub.
export async function iniciarHomologacao({env=process.env, carregarPg=()=>import('pg')}={}) {
 if (env.MANDATO_AMBIENTE !== 'homologacao') throw Error('Ambiente de homologação obrigatório');
 if (env.HABILITAR_API_NEON !== 'sim') throw Error('API desabilitada por padrão');

 if (!env.DATABASE_URL || !/^postgres(?:ql)?:\/\//.test(env.DATABASE_URL)) throw Error('DATABASE_URL do servidor obrigatória');
 // Impede conectar acidentalmente o servidor de testes ao banco Supabase de produção.
 const destino = new URL(env.DATABASE_URL);
 if (destino.hostname.endsWith('.supabase.co') || destino.hostname.includes('supabase') || destino.hostname.includes('pmmsdjozyyxkbuqlkfpb')) throw Error('Banco de produção proibido na homologação');
 // Homologação remota só pode usar o projeto Neon isolado; localhost é reservado a testes locais.
 const host = destino.hostname.toLowerCase();
 const neonIsolado = host.endsWith('.neon.tech') && host.includes('proud-firefly-64745516');
 const local = ['localhost','127.0.0.1','::1'].includes(host);
 if (!neonIsolado && !local) throw Error('Destino de homologação não autorizado');
 const {default:pg} = await carregarPg();
 const pool = new pg.Pool({connectionString:env.DATABASE_URL,ssl:{rejectUnauthorized:true},max:3,connectionTimeoutMillis:3000,idleTimeoutMillis:10000});
 const {executarCidadao,executarAdmin}=criarExecutoresPostgres({pool});
 const operacoesNeon=criarOperacoesNeon({executarCidadao,executarAdmin});
 // Apenas consultas e pedidos de recuperação no banco de TESTES, com habilitação separada.
 // A decisão administrativa continua desabilitada até existir verificação real de identidade.
 const operacoes = env.HABILITAR_ROTAS_CIDADAO_TESTES === 'sim'
  ? {solicitar:operacoesNeon.solicitar, consultar:operacoesNeon.consultar}
  : {};
 // Sem autenticação de administrador integrada, o verificador sempre rejeita.
 const verificarAdmin = env.SUPABASE_ADMIN_UID && env.SUPABASE_PUBLISHABLE_KEY
  ? criarVerificadorAdmin({supabaseUrl:'https://pmmsdjozyyxkbuqlkfpb.supabase.co',chavePublica:env.SUPABASE_PUBLISHABLE_KEY,idsPermitidos:[env.SUPABASE_ADMIN_UID]})
  : async()=>false;
 const origensPermitidas = env.ORIGEM_PAINEL_HOMOLOGACAO === 'https://wagnertomaszewski-boop.github.io'
  ? [env.ORIGEM_PAINEL_HOMOLOGACAO] : [];
 const servidor=criarServidor({operacoes,verificarAdmin,origensPermitidas});
 return {servidor,fechar:async()=>{try {if (servidor.listening) await new Promise((resolve,reject)=>servidor.close(erro=>erro?reject(erro):resolve()));} finally {await pool.end();}}};
}
