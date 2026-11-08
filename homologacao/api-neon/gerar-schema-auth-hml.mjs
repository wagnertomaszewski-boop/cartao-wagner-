// Gerado do contrato da versão instalada; não executa migrações na inicialização.
import {getSchema} from 'better-auth/db';
import {twoFactor} from 'better-auth/plugins';
import {writeFileSync} from 'node:fs';
const schema=getSchema({plugins:[twoFactor()],rateLimit:{storage:'database'},advanced:{database:{generateId:'uuid'}}});
const q=x=>'"'+x+'"';let sql='BEGIN;\nCREATE SCHEMA IF NOT EXISTS auth_admin_hml;\nREVOKE ALL ON SCHEMA auth_admin_hml FROM PUBLIC;\n';
for(const [name,table] of Object.entries(schema)){
 const cols=['id text PRIMARY KEY'];
 for(const [k,v] of Object.entries(table.fields)){
  const type=v.type==='date'?'timestamptz':v.type==='boolean'?'boolean':v.type==='number'?(v.bigint?'bigint':'integer'):'text';
  let def=q(v.fieldName||k)+' '+type+(v.required?' NOT NULL':'')+(v.unique?' UNIQUE':'');
  if(v.defaultValue!==undefined&&typeof v.defaultValue!=='function')def+=' DEFAULT '+(typeof v.defaultValue==='boolean'?String(v.defaultValue):Number(v.defaultValue));
  if(v.references)def+=' REFERENCES auth_admin_hml.'+q(v.references.model)+'(id) ON DELETE CASCADE';
  cols.push(def);
 }
 sql+='CREATE TABLE IF NOT EXISTS auth_admin_hml.'+q(name)+'('+cols.join(',')+');\n';
 for(const [k,v] of Object.entries(table.fields))if(v.index)sql+='CREATE INDEX IF NOT EXISTS '+q(name+'_'+k+'_idx')+' ON auth_admin_hml.'+q(name)+'('+q(v.fieldName||k)+');\n';
}
sql+=`CREATE TABLE IF NOT EXISTS auth_admin_hml.instalacao(id integer PRIMARY KEY CHECK(id=1),consumida boolean NOT NULL DEFAULT false);
INSERT INTO auth_admin_hml.instalacao(id) VALUES(1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS auth_admin_hml.mfa_sessoes(sessao_id text PRIMARY KEY REFERENCES auth_admin_hml.session(id) ON DELETE CASCADE,usuario_id text NOT NULL,confirmado_em timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS auth_admin_hml.limites(chave text PRIMARY KEY,quantidade integer NOT NULL,inicio timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS auth_admin_hml.pedidos(id uuid PRIMARY KEY,protocolo text UNIQUE NOT NULL CHECK(protocolo LIKE 'HML-%'),chave_hash text NOT NULL,versao integer NOT NULL DEFAULT 1,aprovado_por text,aprovado_em timestamptz,desafio_id uuid,codigo_hash text,expira_em timestamptz,tentativas integer NOT NULL DEFAULT 0,confirmado_em timestamptz,consumido_em timestamptz);
CREATE TABLE IF NOT EXISTS auth_admin_hml.auditoria(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,evento text NOT NULL,usuario_id text,pedido_id uuid,criado_em timestamptz NOT NULL DEFAULT now());
COMMIT;
`;
writeFileSync(new URL('./sql/auth-admin-hml.sql',import.meta.url),sql);
