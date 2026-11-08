// Pré-requisitos para ativação: diagnóstico SOMENTE LEITURA.
// Não concede privilégios, não lê dados de cidadãos e não emite chaves.
export async function diagnosticarEmissaoLegada({consultarNeon,fonteVinculoConectada=false,verificacaoIdentidadeConectada=false}={}){
 if(typeof consultarNeon!=='function')throw Error('Consulta privada Neon obrigatória');
 let gravacaoDiretaPermitida=false;
 try{
  const linhas=await consultarNeon(`SELECT
   has_table_privilege(current_user,'mandato_testes.chaves_legadas','INSERT') AS chaves,
   has_table_privilege(current_user,'mandato_testes.acessos_protocolo','INSERT') AS acessos,
   has_table_privilege(current_user,'mandato_testes.auditoria_chaves_legadas','INSERT') AS auditoria`,[]);
  gravacaoDiretaPermitida=Array.isArray(linhas)&&linhas.length===1&&
   linhas[0].chaves===true&&linhas[0].acessos===true&&linhas[0].auditoria===true;
 }catch{gravacaoDiretaPermitida=false;}
 const requisitos={
  fonteVinculoConectada:fonteVinculoConectada===true,
  verificacaoIdentidadeConectada:verificacaoIdentidadeConectada===true,
  gravacaoDiretaPermitida
 };
 return {pronto:Object.values(requisitos).every(Boolean),requisitos,
  observacao:'Emissor PostgreSQL atual usa INSERT direto; RPC fictícia isolada não substitui este caminho'};
}
