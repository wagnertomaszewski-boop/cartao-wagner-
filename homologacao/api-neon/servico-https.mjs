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
 // Autoteste real pelo loopback, sem publicar uma rota de testes ou usar dados pessoais.
 // Somente consulta sem correspondência: comprova HTTP -> pg -> RPC no Neon isolado.
 if(process.env.HABILITAR_AUTOTESTE_NEON_HOMOLOGACAO==='sim'){
  const {randomBytes}=await import('node:crypto');
  const protocolo='TESTE-SEM-CORRESPONDENCIA-'+randomBytes(5).toString('hex').toUpperCase();
  const chave=randomBytes(32).toString('base64url');
  const url='http://127.0.0.1:'+porta+'/api/solicitacoes/consultar';
  const resposta=await fetch(url,{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({protocolo,chave}),signal:AbortSignal.timeout(7000)
  });
  const corpo=await resposta.json();
  if(resposta.status!==200 || !Array.isArray(corpo.resultado) || corpo.resultado.length!==0 ||
   !Array.isArray(corpo.respostas) || corpo.respostas.length!==0 ||
   !Array.isArray(corpo.historico) || corpo.historico.length!==0 ||
   !Array.isArray(corpo.anexos) || corpo.anexos.length!==0)
   throw Error('Autoteste Neon de consulta restrita falhou');
  console.log('AUTOTESTE_NEON_RESTRITO_OK: HTTP -> PostgreSQL -> RPC, sem correspondência');
 }
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
