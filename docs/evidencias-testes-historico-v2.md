# Evidências de homologação — histórico seguro

Verificações realizadas em 2026-11-07 no projeto Neon isolado `proud-firefly-64745516`, esquema `mandato_testes`.

## Testes SQL executados
- `HIST-TESTE-900001` com chave fictícia A (64 caracteres): retornou somente `Evento fictício A`.
- `HIST-TESTE-900001` com chave fictícia B: zero registros.
- `HIST-TESTE-900002` com chave fictícia B: retornou somente `Evento fictício B`.
- `SET LOCAL ROLE mandato_cidadao_a` seguido de `SELECT` direto em `historico_status`: negado pelo PostgreSQL (`permission denied`).
- Consulta à função de histórico com chave inválida: zero registros.
- Consulta de privilégios: `mandato_cidadao_a` e `mandato_cidadao_b` podem executar `consulta_historico_segura`; `mandato_admin_teste` não pode.

## Limitações
- São dados fictícios e testes diretos no banco; não equivalem a teste completo de navegador, API HTTPS e autenticação administrativa.
- Não foram executados os testes Node atualizados diretamente da ramificação GitHub nesta etapa.
- A API HTTPS ainda não está publicada e a flag `SEGURANCA_V2_ATIVA` permanece desligada.
- A produção Supabase ainda expõe funções legadas de consulta por protocolo. **Não considerar a produção protegida**.

## Próxima etapa
Executar `node --test homologacao/api-neon/*.test.mjs v2/seguranca/*.test.mjs` em cópia integral da ramificação, corrigir eventuais falhas, implementar anexos com URLs temporárias e preparar plano de entrega de chaves antigas antes da ativação.
