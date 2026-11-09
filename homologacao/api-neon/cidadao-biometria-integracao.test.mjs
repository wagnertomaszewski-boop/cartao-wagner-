import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {bancoEcossistema,dadosCadastro} from './tests-hml/banco-ecossistema.mjs';import {criarCadastroModeloHml} from './solicitacoes-modelo-hml.mjs';import {criarFluxoIsoladoHml} from './fluxo-isolado-hml.mjs';import {criarGestaoSolicitacoesHml} from './gestao-solicitacoes-hml.mjs';import {criarRecuperacaoManualHml} from './recuperacao-manual-hml.mjs';
test('contrato cidadão biométrico: servidor exige ambos os fatores, reflete Painel e recusa credencial local anterior após recuperação auditada',async()=>{const b=await bancoEcossistema();try{
 const cad=criarCadastroModeloHml(b),consulta=criarFluxoIsoladoHml(b),gestao=criarGestaoSolicitacoesHml(b),manual=criarRecuperacaoManualHml(b),op={usuarioId:'admin-integracao-cidadao-ficticio'};
 const s=await cad.cadastrar({...dadosCadastro,origem:'v2'}),acesso={protocolo:s.protocolo,chave:s.chaveInicial};
 assert.equal((await consulta.consultar({protocolo:s.protocolo})).encontrado,false);assert.equal((await consulta.consultar({...acesso,chave:'B'.repeat(43)})).encontrado,false);
 assert.equal((await consulta.consultar(acesso)).encontrado,true);
 await gestao.atualizar(s.id,op,{status:'Em análise',justificativa:'Análise fictícia do fluxo cidadão e Painel.',responsavel:'Equipe fictícia',revisao:0,operacaoId:randomUUID()});
 await gestao.responder(s.id,op,{mensagem:'Atualização fictícia visível no acompanhamento privado.',responsavel:'Equipe fictícia',revisao:1,operacaoId:randomUUID()});
 const dto=await consulta.consultar(acesso);assert.equal(dto.status,'Em análise');assert.equal(dto.respostas.length,1);assert.doesNotMatch(JSON.stringify(dto),/chave|chave_hash|usuarioId|telefone_cadastrado/);
 const pedido=await manual.solicitar({protocolo:s.protocolo,telefone:dadosCadastro.p_whatsapp}),conferir={decisao:'aprovar',identidadeConferida:true,telefoneConfirmado:dadosCadastro.p_whatsapp,justificativa:'Identidade exclusivamente fictícia conferida.'};await manual.decidir(pedido.pedidoId,op,conferir);const e=await manual.emitir(pedido.pedidoId,op,conferir);assert.equal(e.envioPermitido,false);const r=await manual.validar({...pedido,codigo:e.codigo});assert.equal(r.confirmado,true);
 assert.equal((await consulta.consultar(acesso)).encontrado,false,'O cache local biométrico não pode manter a chave anterior válida');
 assert.equal((await consulta.consultar({protocolo:s.protocolo,chave:r.novaChave})).status,'Em análise');assert.equal((await manual.validar({...pedido,codigo:e.codigo})).confirmado,false);
 const eventos=await manual.auditar(pedido.pedidoId);assert.doesNotMatch(JSON.stringify(eventos),new RegExp(e.codigo));
}finally{await b.pg.close();}});
