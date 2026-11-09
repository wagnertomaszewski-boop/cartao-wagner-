import assert from 'node:assert/strict';
export async function autotestarMidiaConteudo({pool,conteudos,midiaConteudo}){
 const evento='conteudo_midia_autoteste_v1_concluido';if((await pool.query('SELECT 1 FROM auth_admin_hml.auditoria WHERE evento=$1 LIMIT 1',[evento])).rows.length)return;
 const op={usuarioId:'autoteste-midia-ficticio'},origem=(await conteudos.listar(true,'projeto')).find(x=>x.titulo==='projeto fictício de homologação');if(!origem)throw Error('Fixture pública de mídia ausente.');
 const r=await midiaConteudo.anexar(op,{conteudoId:origem.id,versao:origem.versao,uso:'documento',nome:'documento-publico-ficticio.pdf',mime:'application/pdf',base64:Buffer.from('%PDF-1.4\nDocumento exclusivamente fictício de homologação.\n%%EOF\n').toString('base64'),autorizadoParaPublicacao:true});assert.equal((await midiaConteudo.obter(r.arquivoId)).mime,'application/pdf');assert.equal((await conteudos.detalhe(origem.id)).documentos[0].id,r.arquivoId);
 await pool.query('INSERT INTO auth_admin_hml.auditoria(evento,usuario_id) VALUES($1,$2)',[evento,op.usuarioId]);
}
