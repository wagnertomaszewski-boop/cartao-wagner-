import unittest,importlib.util,pathlib,tempfile,zipfile,hashlib,json,io
p=pathlib.Path(__file__).resolve().parents[1]/'backup-storage-isolado.py'
s=importlib.util.spec_from_file_location('backup_storage',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class BackupStorageTest(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=pathlib.Path(self.tmp.name);self.file=self.root/'download.zip';self.data=b'arquivo-ficticio-sem-dados-reais'
  with zipfile.ZipFile(self.file,'w') as z:z.writestr('teste.txt',self.data)
  self.inv=[{'bucket_id':'anexos-solicitacoes','name':'pasta/teste.txt','size':str(len(self.data)),'etag':hashlib.md5(self.data).hexdigest()}]
  self.download=[{'arquivo':str(self.file),'bucket':'anexos-solicitacoes','prefixo':'pasta/'}]
 def tearDown(self):self.tmp.cleanup()
 def test_restaura_bytes_no_destino_novo_com_sha256(self):
  objects,types=m.reunir(self.inv,self.download);self.assertEqual(types['md5'],1)
  r=m.restaurar(m.arquivo_backup(objects,self.inv));self.assertEqual(r['arquivos_restaurados'],1);self.assertEqual(r['bytes_restaurados'],len(self.data))
 def test_recusa_bytes_divergentes_da_origem(self):
  self.inv[0]['etag']='0'*32
  with self.assertRaises(ValueError):m.reunir(self.inv,self.download)
 def test_recusa_falta_e_duplicacao(self):
  for d in [[],self.download*2]:
   with self.assertRaises(ValueError):m.reunir(self.inv,d)
 def test_recusa_travessia_e_bucket_nao_autorizado(self):
  for nome in ['../fora.txt','/absoluto.txt','a/../../fora','a\\fora','a//fora']:
   self.assertFalse(m.caminho_seguro(nome))
  self.inv[0]['bucket_id']='comprovantes-financeiros'
  with self.assertRaises(ValueError):m.reunir(self.inv,self.download)
 def test_recusa_adulteracao_no_zip_restaurado(self):
  objects,_=m.reunir(self.inv,self.download);original=m.arquivo_backup(objects,self.inv);out=io.BytesIO()
  with zipfile.ZipFile(io.BytesIO(original)) as src,zipfile.ZipFile(out,'w') as dst:
   for name in src.namelist():dst.writestr(name,b'adulterado' if name.startswith('objetos/') else src.read(name))
  with self.assertRaises(ValueError):m.restaurar(out.getvalue())
 def test_recusa_entradas_zip_duplicadas(self):
  import warnings
  objects,_=m.reunir(self.inv,self.download);original=m.arquivo_backup(objects,self.inv);out=io.BytesIO(original)
  with warnings.catch_warnings():
   warnings.simplefilter('ignore')
   with zipfile.ZipFile(out,'a') as z:z.writestr('manifesto-privado.json','{}')
  with self.assertRaises(ValueError):m.restaurar(out.getvalue())
 def test_confere_etag_multipart_parte_unica(self):
  tag=hashlib.md5(hashlib.md5(self.data).digest()).hexdigest()+'-1'
  self.assertEqual(m.conferir_etag(self.data,tag),'multipart_parte_unica')
  with self.assertRaises(ValueError):m.conferir_etag(self.data,'etag-sem-formato-verificavel')
if __name__=='__main__':unittest.main()
