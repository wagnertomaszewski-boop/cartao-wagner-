"""Cifra exportação de homologação e verifica integridade; não imprime a chave."""
import argparse,pathlib,hashlib,json,os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
p=argparse.ArgumentParser();p.add_argument('--origem',required=True);p.add_argument('--destino',required=True);p.add_argument('--chave',required=True);a=p.parse_args()
raw=pathlib.Path(a.origem).read_bytes();b=json.loads(raw);assert b['branch']=='br-lively-snow-bev5ecau' and b['formato']=='mandato-backup-integral-hml-v1'
key=AESGCM.generate_key(bit_length=256);nonce=os.urandom(12);header=b'MANDATO-HML-1\n';aad=b'mandato-hml-br-lively-snow-bev5ecau-v1';cipher=AESGCM(key).encrypt(nonce,raw,aad)
for name,data in [(a.destino,header+nonce+cipher),(a.chave,json.dumps({'algoritmo':'AES-256-GCM','chave_hex':key.hex(),'aad':aad.decode(),'cabecalho':'MANDATO-HML-1\n','nonce_bytes':12}).encode())]:
 with os.fdopen(os.open(name,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600),'wb') as f:f.write(data)
saved=pathlib.Path(a.destino).read_bytes();meta=json.loads(pathlib.Path(a.chave).read_text());assert AESGCM(bytes.fromhex(meta['chave_hex'])).decrypt(saved[len(header):len(header)+12],saved[len(header)+12:],meta['aad'].encode())==raw
print(json.dumps({'cifrado':True,'descriptografia_conferida':True,'sha256_origem':hashlib.sha256(raw).hexdigest(),'sha256_cifrado':hashlib.sha256(saved).hexdigest(),'bytes_cifrado':len(saved)}))
