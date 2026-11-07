# Integração HTTP–PostgreSQL: execução e correção — 2026-11-07

## Testes executados
Node v22.16.0, arquivos de testes originais `integracao-http-postgres.test.mjs` (8 casos) e `limite-corpo-http.test.mjs` (3 casos), com módulos de aplicação reconstruídos localmente a partir do código consultado no GitHub. Driver PostgreSQL simulado; **não** houve conexão HTTP com Neon real.

Comando: `cd /mnt/data/v2-original-tests && node --test integracao-http-postgres.test.mjs limite-corpo-http.test.mjs`.

Primeira execução: **10 aprovados, 1 falha** (mock Pool do teste TLS sem `connect()`). Corrigido no arquivo de teste do GitHub, commit `5944a801904b71b142268bab9ba5dfa889df323b`, acrescentando `async connect(){throw Error('Conexão não esperada neste teste');}` ao mock.

Segunda execução: **11 testes, 11 aprovados, 0 falhas, 0 ignorados**, duração total 140,509222 ms. Inclui HTTP→executor simulado com quatro transações, filtragem de campos privados, rejeição de métodos administrativos incorretos, TLS local/remoto, bloqueio de usuários privilegiados/arbitrários, rejeição de sslmode inseguro, limite do corpo e timeout/cabeçalhos.

## Limitações e liberação
Esta rodada valida a suíte original desses dois arquivos sobre módulos reconstruídos, não um checkout integral nem o Neon real. Antes de ativar no aplicativo, ainda são necessários: execução no checkout integral, conexão real HTTP–Neon com conta restrita, isolamento de dois protocolos fictícios existentes, autenticação administrativa e recuperação WhatsApp/manual. **Não liberar ou migrar solicitações reais ainda.**

Sem alteração em produção, Supabase, dados reais ou `main`.
