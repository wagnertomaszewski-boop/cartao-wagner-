import assert from 'node:assert/strict';
// Apenas fixture gerada pelo próprio serviço em auth_admin_hml. Nunca envia mensagens.
export async function autotestarRecuperacaoManual({manual,fluxo,pool}){
 const feito=await pool.query("SELECT 1 FROM auth_admin_hml.auditoria WHERE evento='manual_autoteste_v1_concluido' LIMIT 1");
 if(feito.rows.length)return {jaExecutado:true};
 const op={usuarioId:'autoteste-manual-ficticio-hml'};
 // Este cliente sem destino de WhatsApp usa um número inexistente.
 const p=await manual.criarFixture(op);
 const pedido=await manual.solicitar({protocolo:p.protocolo,telefone:p.telefone});
 const d={decisao:'aprovar',justificativa:'Identidade fictícia conferida pelo autoteste isolado.',identidadeConferida:true,telefoneConfirmado:p.telefone};
 assert.equal((await fluxo.consultar({protocolo:p.protocolo})).encontrado,false);
 await assert.rejects(manual.emitir(pedido.pedidoId,op,d),{status:403});
 await manual.decidir(pedido.pedidoId,op,d);const e=await manual.emitir(pedido.pedidoId,op,d);
 assert.equal(e.entregaConfirmada,false);assert.equal(e.envioPermitido,false);
 const respostas=await Promise.all([manual.validar({...pedido,codigo:e.codigo}),manual.validar({...pedido,codigo:e.codigo})]);
 assert.equal(respostas.filter(r=>r.confirmado).length,1);const final=respostas.find(r=>r.confirmado);
 assert.equal((await fluxo.consultar({protocolo:p.protocolo,chave:p.chaveInicial})).encontrado,false);
 assert.equal((await fluxo.consultar({protocolo:p.protocolo,chave:final.novaChave})).encontrado,true);
 const rejeitado=await manual.solicitar({protocolo:p.protocolo,telefone:p.telefone});
 await manual.decidir(rejeitado.pedidoId,op,{...d,decisao:'rejeitar'});await assert.rejects(manual.emitir(rejeitado.pedidoId,op,d),{status:403});
 const registro=(await pool.query('SELECT codigo_hash,situacao FROM auth_admin_hml.recuperacoes_manuais WHERE id=$1',[pedido.pedidoId])).rows[0];assert.equal(registro.codigo_hash,null);assert.equal(registro.situacao,'concluido');
 await pool.query("INSERT INTO auth_admin_hml.auditoria(evento,usuario_id,pedido_id) VALUES('manual_autoteste_v1_concluido',$1,$2)",[op.usuarioId,pedido.pedidoId]);
 return {jaExecutado:false};
}
