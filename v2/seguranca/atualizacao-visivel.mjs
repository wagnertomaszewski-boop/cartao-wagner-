// Apenas enquanto a tela está visível; nunca sobrepõe requisições ou guarda credenciais.
export function criarAtualizacaoVisivel({atualizar,podeAtualizar,visivel,agendar=setTimeout,cancelar=clearTimeout,intervalo=30000,aoErro=()=>{}}){
 let timer=null,encerrado=false,executando=false;
 const programar=()=>{if(!encerrado)timer=agendar(tentar,intervalo);};
 async function tentar(){timer=null;if(encerrado)return;try{if(!executando&&visivel()&&podeAtualizar()){executando=true;await atualizar();}}catch(e){aoErro(e);}finally{executando=false;programar();}}
 programar();return {parar(){encerrado=true;cancelar(timer);timer=null;}};
}
