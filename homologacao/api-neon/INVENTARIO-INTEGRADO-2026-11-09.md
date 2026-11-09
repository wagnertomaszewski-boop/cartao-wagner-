# Homologação integrada — inventário verificável — 2026-11-09

Escopo: somente branch GitHub `feature/recuperacao-whatsapp-manual`, Neon `proud-firefly-64745516` / branch não primária `br-lively-snow-bev5ecau`. Nenhuma mudança em produção autorizada.

## Verificações realizadas nesta rodada
1. Render workspace `tea-dbnnlv49v7es73d96v70`: serviço `srv-dbno75c9v7es73daf170`, plano free, autoDeploy commit, branch autorizada. Deploy `dep-dbok3mlg1s2s738knc9g` de `c6e041337f36d4321fc0d5c0e4b80a1ab6baad92` consta `live` desde 2026-11-09T03:46:19Z. Estado de deploy NÃO é resultado de testes.
2. Neon: listagem de branches confirmou `br-lively-snow-bev5ecau` não primária e `production` primária, esta não consultada.
3. Neon: consultas somente leitura a `information_schema.tables`, `information_schema.columns` e `pg_proc`/ `pg_class`. Estruturas observadas: solicitacoes(id,cidadao_id,assunto,descricao,status,criado_em); historico_status; chaves_legadas; pedidos_recuperacao; auditoria_chaves_legadas; anexos; respostas; recuperacao_contatos; acessos_protocolo. Existem funções SECURITY DEFINER consulta_segura(protocolo,segredo), consulta_historico_segura(protocolo,chave), consulta_anexos_segura(protocolo,chave), consulta_respostas_segura(protocolo,chave) e funções de recuperação. Existência de função NÃO comprova privilégios corretos nem ausência de endpoints legados.
4. GitHub: leitura de server.mjs e package.json da branch autorizada. Rota POST /api/solicitacoes/consultar delega validação a handler injetado. Rotas administrativas sensíveis exigem bearer, verificação admin e MFA do servidor; comportamento real depende da configuração em servico-https.mjs. npm test declarado; nenhuma suíte Node executada nesta rodada.
5. Revisão do relatório anterior VALIDACAO-CONSULTA-PRIVADA-2026-11-09-0045.md: três testes SQL negativos com protocolo inexistente; não equivalem a teste de isolamento com registro sintético existente.

## Resultado da rodada
Consultas de metadados SQL somente leitura: 3; leituras GitHub: 3; consultas Render: 2; listagem Neon branches: 1. Nenhuma suíte automatizada ou ensaio HTTP executado; aprovações de testes funcionais novos: 0; falhas de testes funcionais novos: 0; ignorados novos: 0. Não somar às suítes históricas sobrepostas.

## Riscos e próximos critérios de liberação
- Inspecionar servico-https.mjs, permissões EXECUTE/SELECT por role, políticas RLS e todas as rotas/RPC legadas antes de afirmar eliminação de acesso por protocolo.
- Usar dois registros sintéticos existentes, com chaves independentes, para provar acesso correto, negativa cruzada, revogação atômica e preservação do histórico.
- Testar MFA, OTP WhatsApp (expiração, uso único), auditoria e erro sem vazamento pela API real.
- Conferir backup/snapshot e restaurar exclusivamente em destino isolado, sem sobrescrever nada.
- Testar interfaces de homologação e artefato distribuível; registrar evidências e repetir apenas falhas.
- Migração futura: backup verificável, inventário de rotas/RPC, criação idempotente de esquema e privilégios, deploy controlado, verificações pós-deploy, rollback sem reativar consulta por protocolo. Supabase, apps publicados e Play Store somente após autorização expressa.

Sem alterações SQL, dados reais, main, produção ou ativação pública nesta rodada.
