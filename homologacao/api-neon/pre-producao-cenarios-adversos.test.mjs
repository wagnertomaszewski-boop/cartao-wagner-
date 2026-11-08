import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {requisitosMigracao} from './prontidao-migracao.mjs';

const script=join(dirname(fileURLToPath(import.meta.url)),'verificar-pre-producao.mjs');
function executar(evidencias){
 const pasta=mkdtempSync(join(tmpdir(),'mandato-preprod-'));
 try{
  const arquivo=join(pasta,'evidencias.json');
  writeFileSync(arquivo,JSON.stringify(evidencias),{mode:0o600});
  return spawnSync(process.execPath,[script,arquivo],{encoding:'utf8'});
 }finally{rmSync(pasta,{recursive:true,force:true});}
}
test('não aceita confirmação textual em vez de evidência booleana',()=>{
 const evidencias=Object.fromEntries(requisitosMigracao.map(k=>[k,true]));
 evidencias.aprovacao_explicita_implantacao='sim';
 const r=executar(evidencias);
 assert.equal(r.status,1);
 assert.deepEqual(JSON.parse(r.stdout).pendentes,['aprovacao_explicita_implantacao']);
});
test('não aceita chaves desconhecidas no checklist de produção',()=>{
 const r=executar({aprovacao_explicita_implantacao:true,ignorar_verificacoes:true});
 assert.equal(r.status,2);
 assert.match(r.stderr,/requisitos desconhecidos/);
});
test('sem backup e plano de reversão comprovados permanece bloqueado',()=>{
 const evidencias=Object.fromEntries(requisitosMigracao.map(k=>[k,true]));
 evidencias.plano_reversao_sem_exposicao=false;
 const r=executar(evidencias);
 assert.equal(r.status,1);
 assert.deepEqual(JSON.parse(r.stdout).pendentes,['plano_reversao_sem_exposicao']);
});
test('checklist completo apenas permite revisão humana, nunca implantação automática',()=>{
 const evidencias=Object.fromEntries(requisitosMigracao.map(k=>[k,true]));
 const r=executar(evidencias);
 assert.equal(r.status,0);
 assert.equal(JSON.parse(r.stdout).liberacao,'APTO_PARA_REVISAO_HUMANA');
});
