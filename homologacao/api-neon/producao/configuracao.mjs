// Configuração candidata. Não é importada pela entrada de homologação.
export const PROJETO='pmmsdjozyyxkbuqlkfpb';
export const ORIGEM_WEB='https://wagnertomaszewski-boop.github.io';
export function validarConfiguracaoPublica(c){
 if(!c||c.ambiente!=='producao'||c.projeto!==PROJETO)throw Error('Configuração de produção obrigatória.');
 const u=new URL(c.apiBase);
 const edge=u.hostname===PROJETO+'.supabase.co'&&u.pathname==='/functions/v1/mandato-privado';
 if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||(!edge&&u.pathname!=='/')||/homolog|localhost|\.invalid$/.test(u.hostname))throw Error('API de produção não aprovada.');
 if(Object.keys(c).some(k=>!['ambiente','projeto','apiBase','versao'].includes(k)))throw Error('A configuração pública não pode conter segredos.');
 return Object.freeze({...c,apiBase:u.origin+u.pathname.replace(/\/$/,'')});
}
export function validarConfiguracaoServidor(env){
 const c=validarConfiguracaoPublica({ambiente:env.MANDATO_AMBIENTE,projeto:env.SUPABASE_PROJECT_REF,apiBase:env.MANDATO_API_ORIGIN,versao:env.MANDATO_RELEASE_SHA});
 if(env.MANDATO_PUBLICACAO_AUTORIZADA!=='sim'||!/^[0-9a-f]{40}$/.test(env.MANDATO_RELEASE_SHA||''))throw Error('Publicação não autorizada.');
 if(typeof env.MANDATO_SEGREDO!=='string'||Buffer.byteLength(env.MANDATO_SEGREDO)<32||env.MANDATO_SEGREDO===env.AUTH_HML_SECRET)throw Error('Segredo produtivo independente obrigatório.');
 const db=new URL(env.DATABASE_URL);
 // Permitir somente o Supabase existente e o papel restrito, nunca postgres/admin.
 // Endpoint direto: IPv6 ou IPv4 contratado. Supavisor: IPv4, sessão (5432)
 // ou transação (6543), recomendado para funções Edge. O usuário do pooler
 // inclui o ID do projeto para impedir conexão acidental a outro tenant.
 const usuario=decodeURIComponent(db.username);
 const direto=db.hostname===`db.${PROJETO}.supabase.co`
  && usuario==='mandato_api_privada'
  && (db.port===''||db.port==='5432');
 const pooler=/^aws-[0-9]+-sa-east-1\\.pooler\\.supabase\\.com$/.test(db.hostname)
  && usuario===`mandato_api_privada.${PROJETO}`
  && (db.port==='5432'||db.port==='6543');
 if(!['postgres:','postgresql:'].includes(db.protocol)||!db.password
  ||db.pathname!=='/postgres'||db.hash||( !direto && !pooler))
  throw Error('Conexão produtiva restrita obrigatória.');
 return c;
}
