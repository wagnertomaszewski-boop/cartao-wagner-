import {criarServidor} from './server.mjs';
import {criarRegistroSinteticoAssinado900007} from './registro-sintetico-assinado-900007.mjs';
import {criarVerificadorAdmin} from './verificar-admin-supabase.mjs';
import {criarOperacoesNeon} from './operacoes-neon.mjs';
import {criarExecutoresPostgres} from './executores-postgres.mjs';
import {criarOperacaoConsultaNeonRestrita} from './operacao-consulta-neon-restrita.mjs';

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
 const consultaPrivadaAtiva=env.HABILITAR_CONSULTA_PRIVADA_HOMOLOGACAO==='sim';
 if(consultaPrivadaAtiva && env.HABILITAR_ROTAS_CIDADAO_TESTES==='sim'){
  await pool.end();
  throw Error('Modos de consulta mutuamente exclusivos');
 }
 const operacoes = consultaPrivadaAtiva
  ? {consultar:criarOperacaoConsultaNeonRestrita({pool})}
  : env.HABILITAR_ROTAS_CIDADAO_TESTES === 'sim'
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
  if(typeof env.SUPABASE_ADMIN_UID!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(env.SUPABASE_ADMIN_UID) ||
   typeof env.SUPABASE_PUBLISHABLE_KEY!=='string' || !env.SUPABASE_PUBLISHABLE_KEY.startsWith('sb_publishable_')) {
   await pool.end();
   throw Error('Autenticação administrativa privada obrigatória');
  }
  if(!integracaoSintetica||typeof integracaoSintetica!=='object'||
   !['buscarAtestado','buscarAuth','consultarNeon','auditar'].every(k=>typeof integracaoSintetica[k]==='function') ||
   !(Array.isArray(integracaoSintetica.conferentesPermitidos) && integracaoSintetica.conferentesPermitidos.length>0) ||
   !integracaoSintetica.operadoresPermitidos || typeof integracaoSintetica.operadoresPermitidos!=='object' ||
   Array.isArray(integracaoSintetica.operadoresPermitidos) || Object.keys(integracaoSintetica.operadoresPermitidos).length===0 ||
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
 // As rotas de chaves nunca são habilitadas só por um sinalizador.
 // Exige identidade validada por serviço externo, autorização administrativa e
 // executor transacional explicitamente fornecidos pelo ambiente de homologação.
 let operacoesChaves=null;
 if(env.HABILITAR_GESTAO_CHAVES_HOMOLOGACAO==='sim'){
  const integracao=integracaoSintetica?.gestaoChaves;
  if(!env.SUPABASE_ADMIN_UID || !env.SUPABASE_PUBLISHABLE_KEY ||
   !integracao || typeof integracao.confirmarIdentidade!=='function' ||
   typeof integracao.autorizarOperador!=='function' ||
   typeof integracao.transacionar!=='function') {
   await pool.end();
   throw Error('Gestão de chaves requer integração privada de identidade e escrita autorizada');
  }
  const [{criarResolvedorOperadorAdmin},{criarGestorChavesPrivadas},{criarAuditorChavesNeon},{criarOperacoesChavesPainel}]=await Promise.all([
   import('./verificar-admin-supabase.mjs'),import('./gestor-chaves-privadas.mjs'),
   import('./auditoria-chaves-neon.mjs'),import('./operacoes-chaves-painel.mjs')
  ]);
  const resolverOperador=criarResolvedorOperadorAdmin({
   supabaseUrl:'https://pmmsdjozyyxkbuqlkfpb.supabase.co',
   chavePublica:env.SUPABASE_PUBLISHABLE_KEY,idsPermitidos:[env.SUPABASE_ADMIN_UID]
  });
  const gestor=criarGestorChavesPrivadas({
   confirmarIdentidade:integracao.confirmarIdentidade,
   autorizarOperador:integracao.autorizarOperador,
   transacionar:integracao.transacionar,
   auditar:criarAuditorChavesNeon()
  });
  operacoesChaves=criarOperacoesChavesPainel({resolverOperador,gestor});
 }
 // Fluxo assinado real de homologação: role separada com EXECUTE apenas na RPC.
 // Não habilitar com chave pública ou credencial ausente; não reutilizar o pool de consulta.
 let poolEscrita=null;
 if(env.HABILITAR_CHAVES_ASSINADAS_HOMOLOGACAO==='sim'){
  const [{criarGestaoChavesAssinadas},{criarOperacoesChavesPainel},{criarResolvedorOperadorAdmin}]=await Promise.all([
   import('./gestao-chaves-assinadas.mjs'),
   import('./operacoes-chaves-painel.mjs'),
   import('./verificar-admin-supabase.mjs')
  ]);
  try{
   if(operacoesChaves||!env.SUPABASE_ADMIN_UID||!env.SUPABASE_PUBLISHABLE_KEY||
    !env.CHAVES_CONFERENTE_PUBLICA_PEM||!env.CHAVES_DATABASE_URL)
    throw Error('Credenciais independentes obrigatórias para chaves assinadas');
   const urlEscrita=new URL(env.CHAVES_DATABASE_URL);
   if(urlEscrita.hostname!==host||decodeURIComponent(urlEscrita.username)!=='mandato_chaves_escrita_hml'||
    !urlEscrita.password||['sslmode','sslcert','sslkey','sslrootcert'].some(k=>urlEscrita.searchParams.has(k)))
    throw Error('Conta de escrita Neon não autorizada');
   poolEscrita=new pg.Pool({connectionString:env.CHAVES_DATABASE_URL,ssl:local?false:{rejectUnauthorized:true},max:2,connectionTimeoutMillis:3000,idleTimeoutMillis:10000});
   // Confirma privilégio de RPC e ausência de escrita direta ANTES de expor as rotas.
   const direitos=await poolEscrita.query(`SELECT
    has_function_privilege(current_user,'mandato_chaves_homologacao.aplicar_chave_privada(bigint,uuid,text,bytea,text,timestamptz)','EXECUTE') AS rpc,
    has_table_privilege(current_user,'mandato_chaves_homologacao.chaves_acompanhamento','UPDATE') AS update_direto,
    has_table_privilege(current_user,'mandato_chaves_homologacao.nonces_atestados','INSERT') AS insert_direto`);
   if(direitos.rows?.[0]?.rpc!==true||direitos.rows[0].update_direto!==false||direitos.rows[0].insert_direto!==false)
    throw Error('Privilégios de escrita incompatíveis');
   const resolverOperador=criarResolvedorOperadorAdmin({
    supabaseUrl:'https://pmmsdjozyyxkbuqlkfpb.supabase.co',
    chavePublica:env.SUPABASE_PUBLISHABLE_KEY,idsPermitidos:[env.SUPABASE_ADMIN_UID]
   });
   const gestao=criarGestaoChavesAssinadas({
    chavePublicaPem:env.CHAVES_CONFERENTE_PUBLICA_PEM,
    poolEscrita,
    operadorPermitido:async({operadorId})=>operadorId===env.SUPABASE_ADMIN_UID
   });
   operacoesChaves=criarOperacoesChavesPainel({resolverOperador,gestor:gestao});
  }catch(erro){
   if(poolEscrita)await poolEscrita.end();
   await pool.end();
   throw erro;
  }
 }
 const servidor=criarServidor({operacoes,verificarAdmin,origensPermitidas,registrarDecisaoSintetica,operacoesChaves});
 return {servidor,fechar:async()=>{try {if (servidor.listening) await new Promise((resolve,reject)=>servidor.close(erro=>erro?reject(erro):resolve()));} finally {await Promise.all([pool.end(),poolEscrita?.end()]);}}};
}
