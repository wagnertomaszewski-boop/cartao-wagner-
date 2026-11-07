# Auditoria de privilégios de papéis — Neon testes — 2026-11-07

Projeto: `proud-firefly-64745516`. Consulta **somente leitura** a `pg_roles` para quatro papéis.

| Papel | LOGIN | SUPERUSER | BYPASSRLS | CREATEROLE |
|---|---|---|---|---|
| mandato_admin_teste | não | não | não | não |
| mandato_cidadao_a | não | não | não | não |
| mandato_cidadao_b | não | não | não | não |
| neondb_owner | sim | não | **sim** | **sim** |

## Implicação de segurança
As funções `mandato_testes.*` previamente auditadas são `SECURITY DEFINER` com proprietário `neondb_owner`. Como esse proprietário possui `BYPASSRLS`, a execução dessas funções pode ignorar RLS, mesmo com `FORCE ROW LEVEL SECURITY` nas tabelas. A segurança depende criticamente de verificação de parâmetros, projeções, autorização por função e grants. **Não considerar RLS sozinho uma barreira dentro dessas funções.**

## Ações necessárias antes de ativar
1. Revisar linha por linha todas as funções `SECURITY DEFINER`, especialmente as de escrita e recuperação.
2. Avaliar migração das funções para owner dedicado sem BYPASSRLS com políticas explícitas; testar primeiro em branch descartável do Neon.
3. Confirmar que o usuário da conexão HTTP só pode `SET ROLE` para papéis permitidos e que não dispõe de operações administrativas extras.
4. Executar testes de isolamento reais sob papéis restritos, com dados fictícios, e testar a autenticação administrativa.

Nenhum papel, permissão, tabela ou dado foi modificado. Nenhum teste HTTP foi executado nesta auditoria.
