import importlib.util,pathlib,tempfile,unittest,hashlib,base64,subprocess
spec=importlib.util.spec_from_file_location('assinatura',pathlib.Path(__file__).parents[1]/'scripts/verificar_assinatura_hml.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class AssinaturaTest(unittest.TestCase):
 def preparar(self,p):return {'PAINEL_HML_KEYSTORE_FILE':p,'PAINEL_HML_KEYSTORE_PASSWORD':'senha-ficticia-nao-real','PAINEL_HML_KEY_ALIAS':'alias-teste','PAINEL_HML_KEY_PASSWORD':'senha-ficticia-chave','PAINEL_HML_CERT_SHA256':hashlib.sha256(b'certificado-ficticio').hexdigest()}
 def executar(self,args,**kw):
  self.assertNotIn('senha-ficticia-nao-real',args);self.assertIn('-storepass:env',args)
  return subprocess.CompletedProcess(args,0,stdout=b'-----BEGIN CERTIFICATE-----\n'+base64.b64encode(b'certificado-ficticio')+b'\n-----END CERTIFICATE-----',stderr=b'')
 def test_ausencia_nao_gera_chave(self):self.assertFalse(m.verificar({},lambda *a,**k:self.fail('Não deve executar keytool')))
 def test_parcial_bloqueia(self):
  with self.assertRaises(m.AssinaturaInvalida):m.verificar({'PAINEL_HML_KEY_ALIAS':'teste'})
 def test_referencia_igual_aceita_sem_expor_senha(self):
  with tempfile.NamedTemporaryFile() as f:self.assertTrue(m.verificar(self.preparar(f.name),self.executar))
 def test_referencia_diferente_bloqueia(self):
  with tempfile.NamedTemporaryFile() as f:
   d=self.preparar(f.name);d['PAINEL_HML_CERT_SHA256']='0'*64
   with self.assertRaises(m.AssinaturaInvalida):m.verificar(d,self.executar)
 def test_falha_omite_saida_privada(self):
  with tempfile.NamedTemporaryFile() as f:
   with self.assertRaises(m.AssinaturaInvalida) as e:m.verificar(self.preparar(f.name),lambda *a,**k:subprocess.CompletedProcess([],1,stdout=b'segredo',stderr=b'segredo'))
   self.assertNotIn('segredo',str(e.exception))
 def test_chave_release_nao_e_usada_como_hml(self):self.assertFalse(m.verificar({'PAINEL_KEYSTORE_FILE':'arquivo-producao'}))
if __name__=='__main__':unittest.main()
