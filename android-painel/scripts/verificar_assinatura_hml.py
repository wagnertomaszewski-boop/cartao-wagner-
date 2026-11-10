"""Confere uma chave HML já existente. Nunca gera chaves nem exibe material de assinatura."""
import base64,hashlib,os,pathlib,re,subprocess,sys

CAMPOS=('PAINEL_HML_KEYSTORE_FILE','PAINEL_HML_KEYSTORE_PASSWORD','PAINEL_HML_KEY_ALIAS','PAINEL_HML_KEY_PASSWORD','PAINEL_HML_CERT_SHA256')
class AssinaturaInvalida(Exception):pass

def verificar(env,executar=subprocess.run):
    valores=[env.get(k,'') for k in CAMPOS]
    if not any(valores):return False
    if not all(valores):raise AssinaturaInvalida('Configuração HML incompleta; nenhum APK será liberado.')
    arquivo,_,alias,_,esperado=valores
    esperado=esperado.strip().replace(':','').lower()
    if not re.fullmatch('[0-9a-f]{64}',esperado) or not pathlib.Path(arquivo).is_file():raise AssinaturaInvalida('Arquivo ou referência de assinatura HML indisponível.')
    # Senha em ambiente, nunca em argumento ou log. Saídas ficam somente na memória.
    args=['keytool','-J-Duser.language=en','-J-Duser.country=US','-list','-rfc','-keystore',arquivo,'-alias',alias,'-storepass:env','PAINEL_HML_KEYSTORE_PASSWORD']
    try:r=executar(args,env=dict(os.environ)|dict(env),capture_output=True,check=False)
    except OSError:raise AssinaturaInvalida('Não foi possível verificar a assinatura HML.') from None
    if r.returncode:raise AssinaturaInvalida('Não foi possível abrir a chave HML; saídas privadas foram omitidas.')
    pem=re.search(br'-----BEGIN CERTIFICATE-----\s*(.*?)\s*-----END CERTIFICATE-----',r.stdout,re.S)
    if not pem:raise AssinaturaInvalida('Assinatura HML não reconhecida.')
    try:digest=hashlib.sha256(base64.b64decode(pem.group(1),validate=False)).hexdigest()
    except Exception:raise AssinaturaInvalida('Assinatura HML inválida.') from None
    if digest!=esperado:raise AssinaturaInvalida('A chave não corresponde à referência aprovada; APK bloqueado.')
    return True

if __name__=='__main__':
    try:print('assinatura_hml=verificada' if verificar(os.environ) else 'assinatura_hml=ausente')
    except AssinaturaInvalida as e:print(str(e),file=sys.stderr);sys.exit(1)
