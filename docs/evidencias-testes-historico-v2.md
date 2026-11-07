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

## Verificações adicionais — 2026-11-07
- Papel `mandato_cidadao_b` com protocolo fictício A e chave A: retornou apenas `Evento fictício A`.
- Mesmo papel com protocolo A e chave B: zero registros.
- Papel `mandato_cidadao_a` com protocolo inexistente e chave A: zero registros.
- Teste automatizado de operações atualizado para diferenciar consultas de detalhes, respostas e histórico. **Execução Node pendente**: o ambiente de execução não conseguiu acessar o repositório GitHub por DNS; não considerar esses testes aprovados até execução efetiva.

## Teste local adicional — 2026-11-07
- Executados **4 testes Node** em reconstrução local equivalente do adaptador `operacoes-neon.mjs`: detalhes/respostas/histórico com campos permitidos, rejeição de chave curta, bloqueio de consultas secundárias sem resultado autenticado e mensagem genérica de recuperação.
- Resultado: **4 aprovados, 0 falhas**.
- Ressalva: este teste foi feito em reconstrução local do adaptador, **não** na cópia integral e exata do repositório. A suíte oficial do GitHub continua pendente.
- Alteração de código na branch: respostas de detalhes agora passam por lista explícita `{assunto,status}`, impedindo vazamento acidental de campos extras retornados pelo banco.
