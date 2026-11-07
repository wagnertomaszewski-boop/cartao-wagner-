# Testes negativos reais de autorização — 2026-11-07

Projeto de testes Neon: `proud-firefly-64745516`. Conta usada: `mandato_api_homologacao`.

## Execuções reais

1. `SELECT * FROM mandato_testes.solicitacoes LIMIT 1` → **rejeitado**, `permission denied for table solicitacoes`, SQLSTATE `42501`.
2. `SELECT * FROM mandato_testes.decidir_recuperacao(999999999,true)` → **rejeitado**, `permission denied for function decidir_recuperacao`, SQLSTATE `42501`. Identificador fictício, função não executada.

## Testes locais reexecutados no Node.js v22.16.0

| Conjunto | Passaram | Falharam |
|---|---:|---:|
| verificar-admin-supabase | 6 | 0 |
| fluxo-recuperacao-automatico | 5 | 0 |
| desafio-recuperacao | 7 | 0 |
| recuperacao-dupla-seguranca | 5 | 0 |
| executores-seguranca | 5 | 0 |
| **Total** | **28** | **0** |

Comando executado em cinco diretórios locais: `node --test *.test.mjs`. Estes diretórios são cópias de trabalho, não checkout atualizado da branch; não inferir cobertura integral da versão no GitHub.

**Ainda pendente:** teste HTTP real com driver `pg`, isolamento de dois registros fictícios existentes, recuperação WhatsApp real e migração. Nenhum dado real alterado.
