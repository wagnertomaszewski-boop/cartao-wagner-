import assert from 'node:assert/strict';
export async function autotestarModeloReal({cadastro,manual,fluxo,pool}){
 const feito=await pool.query("SELECT 1 FROM auth_admin_hml.auditoria WHERE evento='modelo_autoteste_integrado_concluido' LIMIT 1");if(feito.rows.length)return {jaExecutado:true};
 const d={ficticio:true,p_nome:'Pessoa fictícia',p_whatsapp:'+5551000000000',p_localidade:'Homologação',p_assunto:'Cadastro fictício',p_descricao:'Verificação de integração do modelo de solicitações.'};
 const a=await cadastro.cadastrar({...d,origem:'mandato'}),b=await cadastro.cadastrar({...d,origem:'v2'});
 for(const p of [a,b]){assert.equal((await fluxo.consultar({protocolo:p.protocolo})).encontrado,false);assert.equal((await fluxo.consultar({protocolo:p.protocolo,chave:p.chaveInicial})).encontrado,true);}
 assert.equal((await fluxo.consultar({protocolo:a.protocolo,chave:b.chaveInicial})).encontrado,false);
 const legado=await cadastro.importarFixture({cenario:'legado'}),r=await manual.solicitar({protocolo:legado.protocolo,telefone:d.p_whatsapp}),op={usuarioId:'autoteste-modelo-ficticio'},conferencia={decisao:'aprovar',identidadeConferida:true,telefoneConfirmado:d.p_whatsapp,justificativa:'Conferência fictícia para validar adaptação do histórico.'};
 const antes=(await pool.query('SELECT dados_solicitacao FROM auth_admin_hml.pedidos WHERE id=$1',[legado.id])).rows[0].dados_solicitacao;
 await manual.decidir(r.pedidoId,op,conferencia);const e=await manual.emitir(r.pedidoId,op,conferencia);assert.equal(e.envioPermitido,false);
 const v=await manual.validar({...r,codigo:e.codigo});const q=await fluxo.consultar({protocolo:legado.protocolo,chave:v.novaChave});assert.equal(q.encontrado,true);assert.equal(q.historico.length,2);assert.equal(q.respostas.length,1);assert.equal(q.fiscalizacao,undefined);assert.ok(!JSON.stringify(q).includes('https:'));
 assert.deepEqual((await pool.query('SELECT dados_solicitacao FROM auth_admin_hml.pedidos WHERE id=$1',[legado.id])).rows[0].dados_solicitacao,antes);
 await pool.query("INSERT INTO auth_admin_hml.auditoria(evento,usuario_id,pedido_id) VALUES('modelo_autoteste_integrado_concluido',$1,$2)",[op.usuarioId,legado.id]);return {jaExecutado:false};
}
