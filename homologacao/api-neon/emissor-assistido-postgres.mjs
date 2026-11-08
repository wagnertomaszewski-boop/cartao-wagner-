// Composição exclusivamente interna para homologação: sem rota HTTP e sem
// credenciais embutidas. As três fontes são fornecidas pelo servidor confiável.
import {criarEmissorLegadoPostgres} from './emissor-legado-postgres.mjs';
import {criarVerificadorEmissaoAssistida} from './verificador-emissao-assistida.mjs';
export function criarEmissorAssistidoPostgres({pool,buscarVinculo,validarComprovante,auditarTentativa}={}){
 if(!pool||typeof pool.connect!=='function')throw Error('Pool PostgreSQL obrigatório');
 const verificarIdentidade=criarVerificadorEmissaoAssistida({
  buscarVinculo,validarComprovante,
  consultarAprovacao:async(sql,args)=>{
   const cliente=await pool.connect();
   try{
    const resultado=await cliente.query(sql,args);
    return resultado.rows;
   }finally{cliente.release();}
  }
 });
 return criarEmissorLegadoPostgres({pool,verificarIdentidade,auditarTentativa});
}
