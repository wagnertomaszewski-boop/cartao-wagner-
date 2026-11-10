"""Restaura exportação lógica HML somente em PostgreSQL local novo; não conecta ao Neon."""
import argparse,json,os,pathlib,subprocess,hashlib,xml.etree.ElementTree as ET,time
p=argparse.ArgumentParser();p.add_argument('--backup',required=True);p.add_argument('--binarios',required=True);p.add_argument('--destino',default='restauracao_hml');p.add_argument('--porta',default='55438');p.add_argument('--relatorio',required=True);a=p.parse_args()
if not a.destino.startswith('restauracao_hml') or not a.destino.replace('_','').isalnum():raise SystemExit('Destino precisa ser um banco local novo de restauração HML.')
b=json.loads(pathlib.Path(a.backup).read_text());assert b['branch']=='br-lively-snow-bev5ecau' and b['formato']=='mandato-backup-integral-hml-v1'
env=os.environ|{'PGHOST':'127.0.0.1','PGPORT':a.porta,'PGUSER':os.environ.get('USER','agent'),'PGDATABASE':'postgres','PGSSLMODE':'disable','PGOPTIONS':'-c timezone=UTC'}
# Os dados e diagnósticos nunca vão para stdout.
def run(sql,db='postgres'):
 r=subprocess.run([str(pathlib.Path(a.binarios)/'psql'),'-X','-At','-v','ON_ERROR_STOP=1'],env=env|{'PGDATABASE':db},input=sql.encode(),stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 if r.returncode:
  pathlib.Path(a.relatorio+'.erro-privado').write_bytes(r.stderr);raise RuntimeError('Restauração interrompida; diagnóstico no arquivo privado.')
 return r.stdout.decode().strip()
def ident(x):return '"'+x.replace('"','""')+'"'
def literal(x):return "'"+x.replace("'","''")+"'"
def xmljson(x,tag):return json.loads(ET.fromstring(x).find('.//'+tag).text)
def digest(rows):return hashlib.sha256('\n'.join(sorted(json.dumps(r,sort_keys=True,separators=(',',':'),ensure_ascii=False) for r in rows)).encode()).hexdigest()
start=time.time();run('CREATE DATABASE '+ident(a.destino)+';')
for role in b['roles']:
 if not run('SELECT 1 FROM pg_roles WHERE rolname='+literal(role)):run('CREATE ROLE '+ident(role)+' NOLOGIN;')
for ddl in b['schemas']:run(ddl,a.destino)
for s in b['sequences']:
 if not s['identidade']:run(s['ddl'],a.destino)
for t in b['tables']:run(t['ddl'],a.destino)
for f in b['functions'] or []:run(f,a.destino)
checks=[]
for t in b['tables']:
 rows=xmljson(t['dados_xml'],'dados');q=ident(t['schema'])+'.'+ident(t['nome']);cols=','.join(ident(c) for c in t['colunas'])
 if rows:run('INSERT INTO '+q+' ('+cols+') OVERRIDING SYSTEM VALUE SELECT '+cols+' FROM jsonb_populate_recordset(NULL::'+q+','+literal(json.dumps(rows,ensure_ascii=False))+'::jsonb);',a.destino)
 restored=json.loads(run('SELECT coalesce(jsonb_agg(to_jsonb(t)),\'[]\'::jsonb) FROM '+q+' t;',a.destino));assert digest(rows)==digest(restored),'Conteúdo divergente: '+q
 checks.append({'schema':t['schema'],'tabela':t['nome'],'linhas':len(rows),'sha256':digest(rows)})
for group in ['constraints','indexes','triggers','policies']:
 for ddl in b[group] or []:run(ddl,a.destino)
for s in b['sequences']:
 state=xmljson(s['estado_xml'],'estado');q=ident(s['schema'])+'.'+ident(s['nome']);run('SELECT setval('+literal(q)+','+state['valor']+','+str(state['chamada']).lower()+');',a.destino)
 assert run('SELECT last_value::text||\':\'||is_called::text FROM '+q,a.destino)==state['valor']+':'+str(state['chamada']).lower()
for t in b['tables']:
 q=ident(t['schema'])+'.'+ident(t['nome']);run('REVOKE ALL ON TABLE '+q+' FROM PUBLIC;',a.destino)
 if t['rls']:run('ALTER TABLE '+q+' ENABLE ROW LEVEL SECURITY;',a.destino)
 if t['force_rls']:run('ALTER TABLE '+q+' FORCE ROW LEVEL SECURITY;',a.destino)
for f in run("SELECT p.oid::regprocedure::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('auth_admin_hml','ensaio_restauracao_hml','fiscalizacao_homologacao','mandato_testes')",a.destino).splitlines():run('REVOKE ALL ON FUNCTION '+f+' FROM PUBLIC;',a.destino)
for ddl in b['grants'] or []:run(ddl,a.destino)
assert run("SELECT has_table_privilege('mandato_auth_hml','auth_admin_hml.auditoria','UPDATE')",a.destino)=='f'
rel={'restaurado':True,'branch_origem':b['branch'],'capturado_em':b['criado_em'],'postgres':'18.6','tabelas':len(checks),'sequencias':len(b['sequences']),'funcoes':len(b['functions']),'politicas':len(b['policies']),'triggers':len(b['triggers']),'verificacoes':checks,'duracao_segundos':round(time.time()-start,2),'auditoria_update_operador':False,'escopo':'Todos os schemas não sistêmicos da neondb HML, dados de autenticação, anexos BYTEA, funções, políticas RLS, índices, constraints, triggers, grants e estados de sequências. Roles recriadas NOLOGIN e propriedade adaptada ao restaurador local; não é cópia de segredos do Render ou produção.'}
pathlib.Path(a.relatorio).write_text(json.dumps(rel,indent=2));print(json.dumps({k:v for k,v in rel.items() if k!='verificacoes'}))
