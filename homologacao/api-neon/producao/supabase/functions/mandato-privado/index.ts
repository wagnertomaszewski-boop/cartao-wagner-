// CANDIDATA NÃO IMPLANTADA: usa o Supabase existente, sem banco ou serviço Render novo.
import {Buffer} from 'node:buffer';
Object.assign(globalThis,{Buffer});
import pg from 'pg';
import {validarConfiguracaoServidor} from '../../../configuracao.mjs';
import {criarRepositorio} from '../../../repositorio.mjs';
import {criarVerificadorContatoIndependente} from '../../../verificador-contato-independente.mjs';
import {criarFonteAtestadoContato} from '../../../fonte-atestado-contato.mjs';
import {criarStoragePrivado} from '../../../storage.mjs';
import {criarHandlerProducao} from '../../../http.mjs';
import {criarResolvedorMfaRecente} from '../../../mfa.mjs';
import {adaptarParaEdge} from '../../../edge-adaptador.mjs';
const env=Deno.env.toObject();
// Não usar SUPABASE_DB_URL administrativo injetado automaticamente.
env.DATABASE_URL=env.MANDATO_DATABASE_URL;
const config=validarConfiguracaoServidor(env);
const pool=new pg.Pool({connectionString:env.DATABASE_URL,ssl:{rejectUnauthorized:true},max:1});
const privilegios=(await pool.query("SELECT current_user AS usuario,has_table_privilege(current_user,'mandato_privado.auditoria_recuperacao','UPDATE') AS altera_auditoria,has_schema_privilege(current_user,'public','CREATE') AS cria_publico")).rows[0];
if(privilegios.usuario!=='mandato_api_privada'||privilegios.altera_auditoria||privilegios.cria_publico)throw Error('Papel produtivo incompatível.');
const idsPermitidos=String(env.MANDATO_ADMIN_UIDS||'').split(',').filter(Boolean);
// Não existe modo "checkbox" como prova. Sem conferente independente aprovado,
// a regularização antiga fica DESATIVADA e a emissão para número incompleto bloqueada.
const chaveConferente=env.MANDATO_CONFERENTE_ED25519_PUBLIC_KEY||'';
const conferentesPermitidos=String(env.MANDATO_CONFERENTES_EXTERNOS||'').split(',').map(x=>x.trim()).filter(Boolean);
if(Boolean(chaveConferente)!==(conferentesPermitidos.length>0))
 throw Error('Configuração incompleta do verificador de contato legado');
const validarRegularizacaoContato=chaveConferente?criarVerificadorContatoIndependente({
 chavePublicaConferente:chaveConferente,conferentesPermitidos,
 buscarAtestado:criarFonteAtestadoContato({pool})
}):null;
const repositorio=criarRepositorio({pool,segredo:env.MANDATO_SEGREDO,
 segredoChaves:env.PRODUCAO_HMAC_SECRET,
 storage:criarStoragePrivado({credencial:env.SUPABASE_SERVICE_ROLE_KEY}),
 validarRegularizacaoContato});
const handler=criarHandlerProducao({repositorio,origemApi:new URL(config.apiBase).origin,resolverAdminMfa:criarResolvedorMfaRecente({supabaseUrl:env.SUPABASE_URL,chavePublica:env.MANDATO_PUBLISHABLE_KEY,idsPermitidos,sessaoAtiva:async(usuarioId:string,sessionId:string)=>(await pool.query('SELECT mandato_privado.sessao_administrativa_ativa($1::uuid,$2::uuid) AS ativa',[usuarioId,sessionId])).rows[0]?.ativa===true})});
Deno.serve(adaptarParaEdge(handler,{versao:env.MANDATO_RELEASE_SHA}));
