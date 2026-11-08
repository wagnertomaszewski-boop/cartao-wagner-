// Adaptador SOMENTE de leitura para vínculo legado, usado por operador confiável.
// O executor deve usar credencial privada do servidor, nunca token do cidadão.
// Não expõe endpoint, dados pessoais ou qualquer consulta por protocolo ao público.
export function criarBuscaVinculoSupabase({consultar}={}){
 if(typeof consultar!=='function')throw Error('Executor privado de leitura obrigatório');
 return async function buscarVinculo({protocolo}={}){
  if(typeof protocolo!=='string'||!protocolo.trim()||protocolo.length>40)return null;
  const normalizado=protocolo.trim();
  try{
   const linhas=await consultar(
    'SELECT id, protocolo FROM public.solicitacoes WHERE protocolo=$1 LIMIT 2',
    [normalizado]
   );
   if(!Array.isArray(linhas)||linhas.length!==1)return null;
   const linha=linhas[0];
   const id=typeof linha?.id==='string'&&/^[1-9][0-9]*$/.test(linha.id)?Number(linha.id):linha?.id;
   if(!Number.isSafeInteger(id)||id<=0||linha.protocolo!==normalizado)return null;
   return {solicitacaoId:id,protocolo:normalizado};
  }catch{return null;}
 };
}
