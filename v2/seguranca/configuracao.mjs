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
