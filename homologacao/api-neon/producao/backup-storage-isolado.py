"""Backup cifrado e ensaio de restauração de downloads Storage já autorizados.
Não faz rede, não recebe URL/token, não altera Supabase e nunca extrai em destino existente.
Os caminhos reais e os arquivos ficam apenas no arquivo cifrado, fora do repositório.
"""
import argparse,hashlib,io,json,os,pathlib,re,tempfile,zipfile,warnings
from datetime import datetime,timezone
BUCKETS={'anexos-solicitacoes','documentos-respostas'}
def caminho_seguro(nome):
    if not isinstance(nome,str) or not nome or '\\' in nome or '\x00' in nome:return False
    p=pathlib.PurePosixPath(nome)
    return not p.is_absolute() and all(x not in ('','.','..') for x in nome.split('/'))
def conferir_etag(dados,etag):
    e=(etag or '').strip('"').lower()
    if re.fullmatch('[0-9a-f]{32}',e):
        if hashlib.md5(dados).hexdigest()!=e:raise ValueError('Integridade de origem divergente')
        return 'md5'
    if re.fullmatch('[0-9a-f]{32}-1',e):
        if hashlib.md5(hashlib.md5(dados).digest()).hexdigest()+'-1'!=e:raise ValueError('Integridade multipart divergente')
        return 'multipart_parte_unica'
    raise ValueError('ETag sem conferência de origem implementada')
def reunir(inventario,downloads):
    esperados={}
    for r in inventario:
        k=(r['bucket_id'],r['name'])
        if k[0] not in BUCKETS or not caminho_seguro(k[1]) or k in esperados:raise ValueError('Inventário inválido')
        esperados[k]=r
    objetos={};tipos={'md5':0,'multipart_parte_unica':0}
    for d in downloads:
        if d['bucket'] not in BUCKETS:raise ValueError('Bucket não autorizado')
        p=pathlib.Path(d['arquivo']);prefixo=d['prefixo']
        if prefixo and (not prefixo.endswith('/') or not caminho_seguro(prefixo[:-1])):raise ValueError('Prefixo inválido')
        if zipfile.is_zipfile(p):
            with zipfile.ZipFile(p) as z:
                if z.testzip() is not None:raise ValueError('Download ZIP corrompido')
                itens=[(f.filename,z.read(f)) for f in z.infolist() if not f.is_dir()]
        else:
            nomes=[n for b,n in esperados if b==d['bucket'] and n.startswith(prefixo)]
            if len(nomes)!=1:raise ValueError('Download individual não unívoco')
            itens=[(nomes[0][len(prefixo):],p.read_bytes())]
        for nome,dados in itens:
            if not caminho_seguro(nome) or len(pathlib.PurePosixPath(nome).parts)!=1:raise ValueError('Caminho de download não autorizado')
            k=(d['bucket'],prefixo+nome)
            if k not in esperados or k in objetos:raise ValueError('Arquivo estranho ou duplicado')
            r=esperados[k]
            if len(dados)!=int(r['size']):raise ValueError('Tamanho divergente da origem')
            tipo=conferir_etag(dados,r.get('etag'));tipos[tipo]+=1
            objetos[k]=dados
    if set(objetos)!=set(esperados):raise ValueError('Backup incompleto')
    return objetos,tipos

def arquivo_backup(objetos,inventario):
    manifest={'formato':'mandato-storage-v1','projeto':'pmmsdjozyyxkbuqlkfpb','capturado_em':datetime.now(timezone.utc).isoformat(),'inventario':inventario,'arquivos':[{'bucket':b,'nome':n,'bytes':len(d),'sha256':hashlib.sha256(d).hexdigest()} for (b,n),d in sorted(objetos.items())]}
    out=io.BytesIO()
    with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_STORED) as z:
        z.writestr('manifesto-privado.json',json.dumps(manifest,ensure_ascii=False))
        for (b,n),d in sorted(objetos.items()):z.writestr('objetos/'+b+'/'+n,d)
    return out.getvalue()

def restaurar(bytes_zip):
    # Um novo diretório é obrigatório; sem conexão/bucket remoto e sem sobrescrita.
    with tempfile.TemporaryDirectory(prefix='mandato-storage-restauro-') as destino:
        root=pathlib.Path(destino);os.chmod(root,0o700)
        with zipfile.ZipFile(io.BytesIO(bytes_zip)) as z:
            if len(z.namelist())!=len(set(z.namelist())):raise ValueError('Entradas ZIP duplicadas')
            if z.testzip() is not None:raise ValueError('Backup ZIP corrompido')
            m=json.loads(z.read('manifesto-privado.json'))
            if m.get('formato')!='mandato-storage-v1' or m.get('projeto')!='pmmsdjozyyxkbuqlkfpb':raise ValueError('Formato/projeto inválido')
            nomes=set();tamanho=0
            for f in m['arquivos']:
                if f['bucket'] not in BUCKETS or not caminho_seguro(f['nome']):raise ValueError('Caminho de restauração não autorizado')
                nome='objetos/'+f['bucket']+'/'+f['nome']
                if nome in nomes:raise ValueError('Objeto duplicado no manifesto')
                nomes.add(nome);dados=z.read(nome)
                if len(dados)!=f['bytes'] or hashlib.sha256(dados).hexdigest()!=f['sha256']:raise ValueError('Conteúdo divergente no backup')
                path=root/f['bucket']/f['nome'];path.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
                with path.open('xb') as out:out.write(dados)
                path.chmod(0o600)
                if hashlib.sha256(path.read_bytes()).hexdigest()!=f['sha256']:raise ValueError('Conteúdo divergente após restauração')
                tamanho+=len(dados)
            if set(z.namelist())!=nomes|{'manifesto-privado.json'}:raise ValueError('Entradas inesperadas no backup')
            return {'arquivos_restaurados':len(nomes),'bytes_restaurados':tamanho,'sha256_restauracao_conferidos':len(nomes),'destino':'diretório local novo, isolado e removido após conferência'}

def main():
    p=argparse.ArgumentParser();p.add_argument('--inventario',required=True);p.add_argument('--downloads',required=True);p.add_argument('--publica',required=True);p.add_argument('--privada',required=True);p.add_argument('--pgpy-dir',required=True);p.add_argument('--backup',required=True);p.add_argument('--relatorio',required=True);a=p.parse_args()
    import sys;sys.path.insert(0,a.pgpy_dir);import pgpy
    from pgpy.constants import SymmetricKeyAlgorithm,CompressionAlgorithm
    warnings.filterwarnings('ignore',category=DeprecationWarning)
    objetos,tipos=reunir(json.loads(pathlib.Path(a.inventario).read_text()),json.loads(pathlib.Path(a.downloads).read_text()))
    plain=arquivo_backup(objetos,json.loads(pathlib.Path(a.inventario).read_text()))
    publica,_=pgpy.PGPKey.from_file(a.publica);privada,_=pgpy.PGPKey.from_file(a.privada)
    if publica.fingerprint!=privada.pubkey.fingerprint:raise ValueError('Chave de restauração incompatível')
    mensagem=pgpy.PGPMessage.new(plain,compression=CompressionAlgorithm.Uncompressed)
    cifrado=bytes(publica.encrypt(mensagem,cipher=SymmetricKeyAlgorithm.AES256))
    out=pathlib.Path(a.backup)
    with out.open('xb') as f:f.write(cifrado)
    out.chmod(0o600)
    # Restaura o arquivo cifrado realmente salvo, não apenas o ZIP antes da cifra.
    recuperado=bytes(privada.decrypt(pgpy.PGPMessage.from_file(str(out))).message)
    if hashlib.sha256(recuperado).digest()!=hashlib.sha256(plain).digest():raise ValueError('Decifragem divergente')
    restaurado=restaurar(recuperado)
    rel={'projeto':'pmmsdjozyyxkbuqlkfpb','escopo':'arquivos dos buckets anexos-solicitacoes e documentos-respostas','verificado_em':datetime.now(timezone.utc).isoformat(),'arquivos_copiados':len(objetos),'bytes_copiados':sum(map(len,objetos.values())),'etags_origem_conferidos':tipos,'backup_cifrado_sha256':hashlib.sha256(cifrado).hexdigest(),'cifra':'OpenPGP AES-256; chave de restauração já existente','restauracao':restaurado,'limites':{'banco_producao_alterado':False,'arquivos_producao_alterados':False,'politicas_producao_alteradas':False,'restore_storage_api_supabase_testado':False,'auth_incluido':False,'financeiro_incluido':False}}
    pathlib.Path(a.relatorio).write_text(json.dumps(rel,indent=2,ensure_ascii=False));print(json.dumps(rel,ensure_ascii=False))
if __name__=='__main__':main()
