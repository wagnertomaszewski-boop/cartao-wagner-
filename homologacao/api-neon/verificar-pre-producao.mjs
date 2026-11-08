// Pré-produção: verificação SOMENTE de evidências, sem conexão com banco e sem deploy.
import {readFileSync} from 'node:fs';
import {avaliarProntidaoMigracao,requisitosMigracao} from './prontidao-migracao.mjs';

const caminho=process.argv[2];
let evidencias={};
if(caminho){
 try {
  const lido=JSON.parse(readFileSync(caminho,'utf8'));
  if(!lido || typeof lido!=='object' || Array.isArray(lido))throw Error('Formato inválido');
  evidencias=lido;
 }catch{console.error('BLOQUEADO: arquivo de evidências inválido ou ausente');process.exit(2);}
}
const desconhecidas=Object.keys(evidencias).filter(k=>!requisitosMigracao.includes(k));
if(desconhecidas.length){console.error('BLOQUEADO: requisitos desconhecidos:',desconhecidas.join(', '));process.exit(2);}
const resultado=avaliarProntidaoMigracao(evidencias);
console.log(JSON.stringify({ambiente:'pre-producao',liberacao:resultado.apto?'APTO_PARA_REVISAO_HUMANA':'BLOQUEADA',pendentes:resultado.pendentes},null,2));
if(!resultado.apto)process.exitCode=1;
// Este comando nunca executa migração, não liga flags e não concede permissão.
