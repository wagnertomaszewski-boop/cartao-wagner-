// Entrada para hospedagem HTTPS gerenciada, somente em homologação isolada.
// O proxy do provedor termina TLS; este processo escuta HTTP internamente.
import {iniciarHomologacao} from './iniciar-homologacao.mjs';
const porta=Number(process.env.PORT||10000);
if(!Number.isInteger(porta)||porta<1||porta>65535) throw Error('PORT inválida');
const instancia=await iniciarHomologacao();
try {
 await new Promise((resolve,reject)=>{
  instancia.servidor.once('error',reject);
  instancia.servidor.listen(porta,'0.0.0.0',resolve);
 });
 console.log('API de homologação iniciada (sem exibir credenciais)');
} catch (erro) {
 await instancia.fechar();
 throw erro;
}
let encerrando=false;
async function encerrar(){
 if(encerrando)return;
 encerrando=true;
 try{await instancia.fechar();process.exitCode=0;}catch{process.exitCode=1;}
}
process.once('SIGTERM',encerrar);
process.once('SIGINT',encerrar);
