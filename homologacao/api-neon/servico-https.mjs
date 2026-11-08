// Entrada para hospedagem HTTPS gerenciada, somente em homologação isolada.
// O proxy do provedor termina TLS; este processo escuta HTTP internamente.
import {iniciarHomologacao} from './iniciar-homologacao.mjs';
const porta=Number(process.env.PORT||10000);
if(!Number.isInteger(porta)||porta<1||porta>65535) throw Error('PORT inválida');
// O modo isolado não deve sequer configurar verificadores Supabase legados.
const envLegado=process.env.AUTH_HML_ATIVA==='sim'?{
 ...process.env,SUPABASE_ADMIN_UID:'',SUPABASE_PUBLISHABLE_KEY:'',
 HABILITAR_DECISAO_SINTETICA_900007:'nao',HABILITAR_GESTAO_CHAVES_HOMOLOGACAO:'nao',
 HABILITAR_CHAVES_ASSINADAS_HOMOLOGACAO:'nao',HABILITAR_CONFIRMACAO_CIDADAO_HOMOLOGACAO:'nao',
 HABILITAR_RECUPERACAO_MANUAL_HOMOLOGACAO:'nao',HABILITAR_CONCLUSAO_RECUPERACAO_HOMOLOGACAO:'nao'
}:process.env;
const instancia=await iniciarHomologacao({env:envLegado});
let authHml=null;
if(process.env.AUTH_HML_ATIVA==='sim'){
 const {criarServidorAuthHml}=await import('./servidor-auth-hml.mjs');
 try{authHml=await criarServidorAuthHml();}catch(e){await instancia.fechar();throw e;}
 const anterior=instancia.servidor.listeners('request')[0];
 instancia.servidor.removeAllListeners('request');
 instancia.servidor.on('request',async(req,res)=>{
  if(req.url?.startsWith('/api/admin/')||req.url?.startsWith('/api/homologacao/')){
   res.writeHead(410,{'Content-Type':'application/json','Cache-Control':'no-store'});
   return res.end(JSON.stringify({erro:'Use o console administrativo isolado /hml/'}));
  }
  if(await authHml.handler(req,res))return;
  return anterior(req,res);
 });
}
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
  console.log('AUTOTESTE_NEON_DIAGNOSTICO: status='+resposta.status+'; forma='+((Array.isArray(corpo.resultado))?'resultado-array':(typeof corpo.erro==='string'?'erro-generico':'inesperada')));
  if(resposta.status!==200 || !Array.isArray(corpo.resultado) || corpo.resultado.length!==0 ||
   !Array.isArray(corpo.respostas) || corpo.respostas.length!==0 ||
   !Array.isArray(corpo.historico) || corpo.historico.length!==0 ||
   !Array.isArray(corpo.anexos) || corpo.anexos.length!==0)
   throw Error('Autoteste Neon de consulta restrita falhou');
  console.log('AUTOTESTE_NEON_RESTRITO_OK: HTTP -> PostgreSQL -> RPC, sem correspondência');
 }
} catch (erro) {
 await Promise.all([instancia.fechar(),authHml?.fechar()]);
 throw erro;
}
let encerrando=false;
async function encerrar(){
 if(encerrando)return;
 encerrando=true;
 try{await Promise.all([instancia.fechar(),authHml?.fechar()]);process.exitCode=0;}catch{process.exitCode=1;}
}
process.once('SIGTERM',encerrar);
process.once('SIGINT',encerrar);
