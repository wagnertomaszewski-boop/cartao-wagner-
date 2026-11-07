# Bloqueio real de integração HTTP–Neon — 2026-11-07

Consulta somente leitura no projeto `proud-firefly-64745516` identificou os papéis de LOGIN que são membros de `mandato_cidadao_a` ou `mandato_admin_teste`.

| Login | Membro cidadão | Membro admin | BYPASSRLS |
|---|---|---|---|
| cloud_admin | sim | sim | sim |
| neondb_owner | sim | sim | sim |

**Conclusão:** nenhum login de serviço não privilegiado foi identificado com membership necessário ao executor. O código de homologação bloqueia `neondb_owner`, mas não basta trocar o nome: é preciso criar e auditar um login de serviço restrito. Não usar `cloud_admin` na API.

**Próximo passo, condicionado a autorização específica para mudanças no Neon de testes:** criar login de serviço sem BYPASSRLS, conceder somente membership de cidadão (e separar administração por outra credencial, se habilitada), testar `SET LOCAL ROLE`, funções permitidas e rejeição das proibidas, sem dados reais. Não criar usuários ou alterar grants de produção.

**Testes executados nesta rodada:** duas consultas SQL de catálogo somente leitura. Nenhum teste HTTP nem alteração de banco.
