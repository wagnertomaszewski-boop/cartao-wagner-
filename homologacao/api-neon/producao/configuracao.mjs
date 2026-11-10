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
 // Somente o banco Supabase existente: nunca o Neon HML.
 if(db.protocol!=='postgresql:'||decodeURIComponent(db.username)!=='mandato_api_privada'||!db.password||db.hostname!==`db.${PROJETO}.supabase.co`||db.pathname!=='/postgres')throw Error('Conexão produtiva restrita obrigatória.');
 return c;
}
