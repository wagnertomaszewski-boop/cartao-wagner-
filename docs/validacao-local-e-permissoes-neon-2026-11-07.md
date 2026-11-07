# Validação executada — 2026-11-07

## Node.js local
Reexecução de testes com `node --test *.test.mjs` em cinco diretórios locais de cópias de módulos do V2:

| Conjunto | Aprovados | Falhas |
|---|---:|---:|
| executores-seguranca | 5 | 0 |
| verificar-admin-supabase | 6 | 0 |
| fluxo-recuperacao-automatico | 5 | 0 |
| desafio-recuperacao | 7 | 0 |
| recuperacao-dupla-seguranca | 5 | 0 |
| **Total** | **28** | **0** |

Execução Node.js v22.16.0. Os testes foram executados sobre arquivos locais anteriormente preparados; não houve execução da suíte HTTP integrada com driver PostgreSQL real.

## Neon de testes
SQL executado com `role_name=mandato_api_homologacao`:

`SELECT current_user, has_schema_privilege(current_user,'mandato_testes','USAGE'), has_table_privilege(current_user,'mandato_testes.solicitacoes','SELECT'), pg_has_role(current_user,'mandato_admin_teste','MEMBER')`

Resultado: conta de serviço identificada; uso do schema = verdadeiro; `SELECT` direto na tabela de solicitações = falso; membership administrativo = falso.

## Pendências
- Rodar HTTP local com driver `pg` e credenciais restritas do Neon, sem expor senha.
- Testar isolamento com dois registros fictícios existentes.
- Confirmar que o código da branch continua sincronizado com as cópias locais antes de declarar testes da versão final.

Nenhuma modificação de dados reais ou produção nesta etapa.
