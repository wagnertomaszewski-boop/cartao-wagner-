"""Ensaio de dados de solicitações: somente cluster PostgreSQL local temporário novo.
Não restaura Storage binário, Auth, segredos ou configurações de plataforma.
"""
import argparse,json,pathlib,subprocess,tempfile,os,shutil,hashlib,xml.etree.ElementTree as ET,warnings,sys
p=argparse.ArgumentParser();p.add_argument('--backup',required=True);p.add_argument('--chave',required=True);p.add_argument('--pgpy-dir',required=True);p.add_argument('--pgroot',required=True);p.add_argument('--relatorio',required=True);a=p.parse_args()
sys.path.insert(0,a.pgpy_dir);import pgpy
warnings.filterwarnings('ignore')
key,_=pgpy.PGPKey.from_file(a.chave);mensagem=pgpy.PGPMessage.from_file(a.backup);texto=key.decrypt(mensagem).message
b=json.loads(texto);del key,mensagem,texto
assert b['projeto']=='pmmsdjozyyxkbuqlkfpb' and b['formato']=='mandato-backup-solicitacoes-producao-v1'
esperadas={'solicitacoes','solicitacoes_status_historico','respostas_solicitacoes','solicitacoes_fiscalizacao_historico'}
assert {t['nome'] for t in b['tabelas']}==esperadas
root=pathlib.Path(tempfile.mkdtemp(prefix='mandato-restauro-',dir='/tmp'));os.chmod(root,0o700)
runtime=pathlib.Path(a.pgroot);binarios=runtime/'usr/lib/postgresql/18/bin'
env=dict(os.environ,LD_LIBRARY_PATH=str(runtime/'usr/lib/x86_64-linux-gnu'),PGHOST='127.0.0.1',PGPORT='55439',PGUSER=os.environ.get('USER','agent'),PGDATABASE='postgres',PGSSLMODE='disable',PGOPTIONS='-c timezone=UTC')
def processo(nome,args,input=None):
 r=subprocess.run([str(binarios/nome),*args],input=input,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 if r.returncode:raise RuntimeError('Falha na etapa local '+nome+'; dados e diagnósticos privados omitidos.')
 return r.stdout.decode().strip()
def sql(texto):return processo('psql',['-X','-At','-v','ON_ERROR_STOP=1'],texto.encode())
def literal(v):return "'"+v.replace("'","''")+"'"
def ident(v):assert v in esperadas or v.isidentifier();return '"'+v+'"'
def digest(rows):return hashlib.sha256('\n'.join(sorted(json.dumps(r,sort_keys=True,separators=(',',':'),ensure_ascii=False) for r in rows)).encode()).hexdigest()
servidor=None
try:
 processo('initdb',['-D',str(root/'data'),'-A','trust','--no-locale','-E','UTF8'])
 with (root/'servidor-privado.log').open('wb') as log:
  servidor=subprocess.Popen([str(binarios/'postgres'),'-D',str(root/'data'),'-p','55439','-h','127.0.0.1','-k','','-c','log_statement=none'],env=env,stdout=log,stderr=log)
  import time
  for _ in range(50):
   r=subprocess.run([str(binarios/'pg_isready'),'-h','127.0.0.1','-p','55439'],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
   if r.returncode==0:break
   time.sleep(.1)
  else:raise RuntimeError('PostgreSQL local não iniciou.')
  sql("CREATE SEQUENCE public.protocolo_seq;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;")
  for t in b['tabelas']:sql(t['ddl'])
  checks=[]
  for t in b['tabelas']:
   rows=json.loads(ET.fromstring(t['dados_xml']).find('.//dados').text);q='public.'+ident(t['nome']);cols=','.join(ident(c) for c in t['colunas'])
   if rows:sql('INSERT INTO '+q+' ('+cols+') OVERRIDING SYSTEM VALUE SELECT '+cols+' FROM jsonb_populate_recordset(NULL::'+q+','+literal(json.dumps(rows,ensure_ascii=False))+'::jsonb);')
   copia=json.loads(sql('SELECT coalesce(jsonb_agg(to_jsonb(t)),\'[]\'::jsonb) FROM '+q+' t;'));assert digest(rows)==digest(copia),'Divergência na restauração'
   checks.append({'tabela':t['nome'],'linhas':len(rows),'sha256':digest(rows)})
  # Somente referências opacas para conferir FK; NÃO restaura autenticação.
  sql('INSERT INTO auth.users(id) SELECT DISTINCT registrado_por FROM public.solicitacoes_fiscalizacao_historico WHERE registrado_por IS NOT NULL;')
  for ddl in b['constraints'] or []:sql(ddl)
  for ddl in b['indices'] or []:sql(ddl)
  seq=ET.fromstring(b['sequencia_protocolo_xml']);valor=seq.find('.//last_value').text;chamada=seq.find('.//is_called').text;sql("SELECT setval('public.protocolo_seq',"+valor+','+chamada+');')
  orfaos=int(sql('SELECT count(*) FROM public.respostas_solicitacoes r LEFT JOIN public.solicitacoes s ON s.id=r.solicitacao_id WHERE s.id IS NULL;'));assert orfaos==0
  rel={'restaurado_dados_solicitacoes':True,'projeto':b['projeto'],'capturado_em':b['capturado_em'],'postgres':sql('SHOW server_version;'),'tabelas':checks,'respostas_orfas':orfaos,'objetos_storage_somente_metadata':len(b.get('objetos_metadata') or []),'arquivo_cifrado_sha256':hashlib.sha256(pathlib.Path(a.backup).read_bytes()).hexdigest(),'limites':{'restauracao_integral_producao':False,'storage_binario_restaurado':False,'auth_restaurado':False,'politicas_funcoes_plataforma_restauradas':False,'financeiro_incluido':False},'destino':'cluster local novo, isolado e removido após conferência'}
  pathlib.Path(a.relatorio).write_text(json.dumps(rel,indent=2));print(json.dumps({k:v for k,v in rel.items() if k!='tabelas'}))
finally:
 if servidor:servidor.terminate();servidor.wait(timeout=15)
 shutil.rmtree(root)
