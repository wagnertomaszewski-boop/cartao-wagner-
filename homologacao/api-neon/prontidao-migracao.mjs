// Barreira de implantação: nenhum teste aprovado substitui migração de dados
// nem autoriza ativar consulta protegida em produção.
export const requisitosMigracao=Object.freeze([
 'api_producao_autorizada',
 'protocolos_legados_acessiveis_com_chave',
 'emissao_chaves_com_identidade_verificada',
 'historico_respostas_anexos_validados',
 'rpc_publicas_restritas_sem_contorno',
 'plano_reversao_sem_exposicao',
 'auditoria_e_monitoramento_ativos',
 'aprovacao_explicita_implantacao'
]);
export function avaliarProntidaoMigracao(evidencias={}){
 const pendentes=requisitosMigracao.filter(nome=>evidencias[nome]!==true);
 return Object.freeze({apto:pendentes.length===0,pendentes});
}
