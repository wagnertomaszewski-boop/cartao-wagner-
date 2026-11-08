import {criarServidor} from './server.mjs';
import {criarRegistroSinteticoAssinado900007} from './registro-sintetico-assinado-900007.mjs';
import {criarVerificadorAdmin} from './verificar-admin-supabase.mjs';
import {criarOperacoesNeon} from './operacoes-neon.mjs';
import {criarExecutoresPostgres} from './executores-postgres.mjs';

// Inicialização de homologação local: NÃO habilita administração sem verificador real.
// DATABASE_URL é segredo do servidor. Nunca incluir no frontend ou no GitHub.
export async function iniciarHomologacao({env=process.env, carregarPg=()=>import('pg'), integracaoSintetica=null}={}) {
 if (env.MANDATO_AMBIENTE !== 'homologacao') throw Error('Ambiente de homologação obrigatório');
 if (env.HABILITAR_API_NEON !== 'sim') throw Error('API desabilitada por padrão');

 if (!env.DATABASE_URL || !/^postgres(?:ql)?:\/\//.test(env.DATABASE_URL)) throw Error('DATABASE_URL do servidor obrigatória');
 // Impede conectar acidentalmente o servidor de testes ao banco Supabase de produção.
 const destino = new URL(env.DATABASE_URL);
 if (destino.hostname.endsWith('.supabase.co') || destino.hostname.includes('supabase') || destino.hostname.includes('pmmsdjozyyxkbuqlkfpb')) throw Error('Banco de produção proibido na homologação');
 // Homologação remota só pode usar o projeto Neon isolado; localhost é reservado a testes locais.
 const host = destino.hostname.toLowerCase();
 const local = ['localhost','127.0.0.1','::1'].includes(host);
 // O hostname Neon não contém necessariamente o ID do projeto. Exige correspondência exata
 // com o host configurado privadamente no servidor, nunca fornecido pelo navegador.
 const neonIsolado = host.endsWith('.neon.tech') && host !== 'neon.tech' && env.NEON_HOST_HOMOLOGACAO === host && destino.username.length > 0 && destino.password.length > 0;
 if (!neonIsolado && !local) throw Error('Destino de homologação não autorizado');
 // Nunca conectar a API remota com o proprietário privilegiado das funções.
 // Exigir conta de serviço própria e previamente auditada. Não cria usuários.
 if (!local) {
  const usuario = decodeURIComponent(destino.username);
  if (['neondb_owner','cloud_admin','postgres','root'].includes(usuario.toLowerCase()))
   throw Error('Conta privilegiada proibida na API');
  if (usuario !== 'mandato_api_homologacao' || env.NEON_USUARIO_SERVICO_HOMOLOGACAO !== usuario)
   throw Error('Usuário de serviço de homologação não autorizado');
 }
 // O driver pg pode substituir a configuração TLS por parâmetros da URL.
 // Bloquear overrides que poderiam enfraquecer a verificação de certificado.
 if (!local && ['sslmode','sslcert','sslkey','sslrootcert'].some(chave=>destino.searchParams.has(chave)))
  throw Error('Parâmetros SSL na DATABASE_URL não autorizados');
 const {default:pg} = await carregarPg();
 const pool = new pg.Pool({connectionString:env.DATABASE_URL,ssl:local ? false : {rejectUnauthorized:true},max:3,connectionTimeoutMillis:3000,idleTimeoutMillis:10000});
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
 // A rota sintética exige opt-in explícito do servidor E dependências privadas.
 // Nunca habilitar por configuração pública ou apenas por sinalizador.
 let registrarDecisaoSintetica=null;
 if(env.HABILITAR_DECISAO_SINTETICA_900007==='sim'){
  if(!integracaoSintetica||typeof integracaoSintetica!=='object'||
   !['buscarAtestado','buscarAuth','consultarNeon','auditar'].every(k=>typeof integracaoSintetica[k]==='function') ||
   !['conferentesPermitidos','operadoresPermitidos'].every(k=>Array.isArray(integracaoSintetica[k]) && integracaoSintetica[k].length>0) ||
   !integracaoSintetica.chavePublicaConferente)
  { await pool.end(); throw Error('Integração sintética privada obrigatória'); }
  try {
   registrarDecisaoSintetica=criarRegistroSinteticoAssinado900007({
    ...integracaoSintetica,
    supabaseUrl:'https://pmmsdjozyyxkbuqlkfpb.supabase.co',
    supabasePublishableKey:env.SUPABASE_PUBLISHABLE_KEY
   });
  } catch (erro) {
   await pool.end();
   throw erro;
  }
 }
 const servidor=criarServidor({operacoes,verificarAdmin,origensPermitidas,registrarDecisaoSintetica});
 return {servidor,fechar:async()=>{try {if (servidor.listening) await new Promise((resolve,reject)=>servidor.close(erro=>erro?reject(erro):resolve()));} finally {await pool.end();}}};
}
