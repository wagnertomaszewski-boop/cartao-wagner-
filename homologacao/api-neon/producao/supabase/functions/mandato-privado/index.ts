// CANDIDATA NÃO IMPLANTADA: usa o Supabase existente, sem banco ou serviço Render novo.
import {Buffer} from 'node:buffer';
Object.assign(globalThis,{Buffer});
import pg from 'pg';
import {validarConfiguracaoServidor} from '../../../configuracao.mjs';
import {criarRepositorio} from '../../../repositorio.mjs';
import {criarStoragePrivado} from '../../../storage.mjs';
import {criarHandlerProducao} from '../../../http.mjs';
import {criarResolvedorMfaRecente} from '../../../mfa.mjs';
import {adaptarParaEdge} from '../../../edge-adaptador.mjs';
const env=Deno.env.toObject();
// Não usar SUPABASE_DB_URL administrativo injetado automaticamente.
env.DATABASE_URL=env.MANDATO_DATABASE_URL;
const config=validarConfiguracaoServidor(env);
const pool=new pg.Pool({connectionString:env.DATABASE_URL,ssl:{rejectUnauthorized:true},max:1});
const privilegios=(await pool.query("SELECT current_user AS usuario,has_table_privilege(current_user,'mandato_privado.auditoria','UPDATE') AS altera_auditoria,has_schema_privilege(current_user,'public','CREATE') AS cria_publico")).rows[0];
if(privilegios.usuario!=='mandato_api_privada'||privilegios.altera_auditoria||privilegios.cria_publico)throw Error('Papel produtivo incompatível.');
const idsPermitidos=String(env.MANDATO_ADMIN_UIDS||'').split(',').filter(Boolean);
const repositorio=criarRepositorio({pool,segredo:env.MANDATO_SEGREDO,emissorUid:idsPermitidos[0],storage:criarStoragePrivado({credencial:env.SUPABASE_SERVICE_ROLE_KEY})});
const handler=criarHandlerProducao({repositorio,origemApi:new URL(config.apiBase).origin,resolverAdminMfa:criarResolvedorMfaRecente({supabaseUrl:env.SUPABASE_URL,chavePublica:env.MANDATO_PUBLISHABLE_KEY,idsPermitidos,sessaoAtiva:async(usuarioId:string,sessionId:string)=>(await pool.query('SELECT mandato_privado.sessao_administrativa_ativa($1::uuid,$2::uuid) AS ativa',[usuarioId,sessionId])).rows[0]?.ativa===true})});
Deno.serve(adaptarParaEdge(handler,{versao:env.MANDATO_RELEASE_SHA}));
