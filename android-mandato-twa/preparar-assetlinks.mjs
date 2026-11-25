import {readFile,writeFile} from 'node:fs/promises';

const pacote='com.wagnertomaszewski.mandatoemacao';
const relacao='delegate_permission/common.handle_all_urls';
const upload='F4:CB:CF:BA:89:1F:54:53:34:B2:39:81:AC:E8:BC:BD:70:E3:F0:4C:F9:18:F6:35:8A:88:F0:F7:75:7F:F0:F0';
const [entrada,saida,...certificados]=process.argv.slice(2);
const play=certificados.map(valor=>valor.trim().toUpperCase());
if(!entrada||!saida||!play.length||play.some(valor=>!/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(valor))||play.every(valor=>valor===upload))
 throw Error('Informe a origem, um novo arquivo e os SHA-256 de assinatura do app da Play.');
const associacoes=JSON.parse(await readFile(entrada,'utf8'));
if(!Array.isArray(associacoes))throw Error('O JSON de origem precisa conter uma lista de associações.');
const existentes=new Set(associacoes.filter(item=>item?.relation?.includes(relacao)&&
 item.target?.namespace==='android_app'&&item.target.package_name===pacote)
 .flatMap(item=>item.target.sha256_cert_fingerprints??[])
 .map(valor=>valor.toUpperCase()));
const novas=[...new Set([upload,...play])].filter(valor=>!existentes.has(valor));
if(novas.length)associacoes.push({relation:[relacao],target:{
 namespace:'android_app',package_name:pacote,sha256_cert_fingerprints:novas
}});
await writeFile(saida,JSON.stringify(associacoes,null,2)+'\n',{flag:'wx'});
