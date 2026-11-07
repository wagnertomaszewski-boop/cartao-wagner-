# Histórico protegido — implementação e testes de homologação

## Estado atual em 2026-11-07
No projeto **Neon isolado**, a tabela `mandato_testes.historico_status` e a função `consulta_historico_segura(p_protocolo,p_chave)` foram implementadas. A tabela tem RLS habilitada e forçada. Papéis cidadãos não possuem acesso direto à tabela. A função valida protocolo e chave e retorna apenas registros marcados explicitamente para visualização pública.

A V2 publicada **continua usando os RPCs legados da produção** e não deve ser considerada protegida. A flag `SEGURANCA_V2_ATIVA` permanece `false` na ramificação de desenvolvimento até migração completa.

## Estrutura de histórico
Campos: `id`, `solicitacao_id`, `status`, `observacao`, `criado_em` e `visivel_cidadao boolean NOT NULL DEFAULT false`. A função segura filtra `visivel_cidadao IS TRUE` e exige a chave correta. Observações administrativas não podem ser automaticamente classificadas como públicas.

## Integração na ramificação
- Executor PostgreSQL autoriza somente SQL parametrizado para a função segura.
- API expõe somente `status`, `observacao` e `criado_em`.
- V2 renderiza histórico com `textContent`, sem HTML de origem externa e sem fallback legado no modo seguro.
- A suíte Node completa da ramificação ainda não foi executada; não presumir aprovação.

## Verificações reais no Neon de testes
- Protocolo e chave corretos: apenas evento público fictício.
- Chave incorreta ou protocolo inexistente: nenhum evento.
- `SELECT` direto da tabela como cidadão: permissão negada.
- Evento fictício privado inserido com `visivel_cidadao=false`: **não aparece**, mesmo com chave correta, nos dois papéis de cidadão.

## Antes de ativar produção
1. Revisar quais atualizações legadas podem ser mostradas ao cidadão, sem liberar notas internas.
2. Proteger criação de novas solicitações, respostas e anexos, e validar autenticação administrativa.
3. Executar a suíte completa, testes de navegador e revisão de permissões.
4. Preparar entrega e recuperação de chaves de acesso para protocolos antigos.
5. Desativar RPCs públicos legados somente depois de migração coordenada e verificação de compatibilidade.

Detalhes e evidências em `docs/evidencias-testes-historico-v2.md`.
