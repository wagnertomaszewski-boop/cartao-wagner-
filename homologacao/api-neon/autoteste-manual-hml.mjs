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
export async function autotestarDestinoPessoal({manual,pool}){
 const r=await pool.query("SELECT 1 FROM auth_admin_hml.auditoria WHERE evento='manual_autoteste_v2_destino_concluido' LIMIT 1");if(r.rows.length)return {jaExecutado:true};
 // Número deliberadamente fictício. Nenhum aplicativo ou provedor é acionado.
 const op={usuarioId:'autoteste-destino-ficticio-hml'},telefone='+5551000000001';
 const p=await manual.criarFixture(op,{telefone,confirmacaoTelefone:telefone,autorizoMeuNumero:true});
 const pedido=await manual.solicitar({protocolo:p.protocolo,telefone});
 const d={decisao:'aprovar',identidadeConferida:true,telefoneConfirmado:telefone,justificativa:'Conferência de fixture do autoteste de autorização pessoal.'};
 await manual.decidir(pedido.pedidoId,op,d);const e=await manual.emitir(pedido.pedidoId,op,d);assert.equal(e.envioPermitido,true);assert.equal(e.entregaConfirmada,false);
 assert.equal((await manual.validar({...pedido,codigo:e.codigo})).confirmado,true);assert.equal((await manual.validar({...pedido,codigo:e.codigo})).confirmado,false);
 const evidencia=JSON.stringify((await pool.query('SELECT evento FROM auth_admin_hml.auditoria WHERE pedido_id IN ($1,$2)',[p.id,pedido.pedidoId])).rows);assert.ok(!evidencia.includes(telefone));assert.ok(!evidencia.includes(e.codigo));assert.ok(evidencia.includes('manual_codigo_reuso_bloqueado'));
 await pool.query("INSERT INTO auth_admin_hml.auditoria(evento,usuario_id,pedido_id) VALUES('manual_autoteste_v2_destino_concluido',$1,$2)",[op.usuarioId,pedido.pedidoId]);return {jaExecutado:false};
}
export async function autotestarConcorrenciaEntrePedidos({manual,pool}){
 const feito=await pool.query("SELECT 1 FROM auth_admin_hml.auditoria WHERE evento='manual_autoteste_v3_telas_concluido' LIMIT 1");if(feito.rows.length)return {jaExecutado:true};
 const op={usuarioId:'autoteste-telas-ficticio-hml'},p=await manual.criarFixture(op),a=await manual.solicitar({protocolo:p.protocolo,telefone:p.telefone}),b=await manual.solicitar({protocolo:p.protocolo,telefone:p.telefone});
 const d={decisao:'aprovar',identidadeConferida:true,telefoneConfirmado:p.telefone,justificativa:'Conferência de fixtures concorrentes para integração das telas.'};
 for(const r of [a,b])await manual.decidir(r.pedidoId,op,d);
 const ea=await manual.emitir(a.pedidoId,op,d),eb=await manual.emitir(b.pedidoId,op,d);
 const resultados=await Promise.all([manual.validar({...a,codigo:ea.codigo}),manual.validar({...b,codigo:eb.codigo})]);assert.equal(resultados.filter(r=>r.confirmado).length,1);
 const auditoria=await manual.auditar(a.pedidoId);assert.ok(auditoria.eventos.some(e=>e.evento==='manual_aprovacao'));
 const prazo=(await pool.query('SELECT extract(epoch FROM (expira_em-emitido_em))::float AS segundos FROM auth_admin_hml.recuperacoes_manuais WHERE id=$1',[a.pedidoId])).rows[0];assert.equal(prazo.segundos,300);
 await pool.query("INSERT INTO auth_admin_hml.auditoria(evento,usuario_id,pedido_id) VALUES('manual_autoteste_v3_telas_concluido',$1,$2)",[op.usuarioId,a.pedidoId]);return {jaExecutado:false};
}
