// Leitura privada e estritamente limitada do vínculo protocolo-ID no Supabase.
// Somente no servidor, nunca no navegador. NÃO ativa a consulta em produção.
// A chave deve vir de gerenciador de segredos; nenhuma chave é gravada no repositório.
export function criarConsultaPrivadaSupabase({
 url,serviceRoleKey,fetchPrivado=globalThis.fetch,timeoutMs=4000
}={}){
 if(typeof url!=='string'||typeof serviceRoleKey!=='string'||serviceRoleKey.length<20||
  typeof fetchPrivado!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<100||timeoutMs>10000)
  throw Error('Configuração privada incompleta');
 const origem=new URL(url);
 if(origem.protocol!=='https:'||origem.username||origem.password||origem.search||
  origem.hash||origem.pathname!=='/'||!origem.hostname.endsWith('.supabase.co'))
  throw Error('Origem Supabase não autorizada');
 return async function consultar(sql,parametros){
  if(sql!=='SELECT id, protocolo FROM public.solicitacoes WHERE protocolo=$1 LIMIT 2'||
   !Array.isArray(parametros)||parametros.length!==1||
   typeof parametros[0]!=='string'||parametros[0].length>40||!/^[A-Za-z0-9-]+$/.test(parametros[0]))
   throw Error('Consulta não autorizada');
  const destino=new URL('/rest/v1/solicitacoes',origem);
  destino.searchParams.set('select','id,protocolo');
  destino.searchParams.set('protocolo','eq.'+parametros[0]);
  destino.searchParams.set('limit','2');
  const resposta=await fetchPrivado(destino.toString(),{
   method:'GET',
   headers:{apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey,Accept:'application/json'},
   signal:AbortSignal.timeout(timeoutMs),
   redirect:'error',
   cache:'no-store'
  });
  if(!resposta.ok)throw Error('Consulta privada indisponível');
  const linhas=await resposta.json();
  if(!Array.isArray(linhas)||linhas.length>2)throw Error('Resposta privada inválida');
  return linhas;
 };
}
