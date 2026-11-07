# Conta de serviço restrita — Neon de testes — 2026-11-07

Autorização explícita do usuário para criar conta **somente** no projeto Neon isolado `proud-firefly-64745516`, branch Neon `br-bitter-math-bei1cwt3` (nome interno `production`, **não** Supabase produção).

Criada conta `mandato_api_homologacao` com acesso `read_only` ao esquema `public` e banco `neondb`, sem grants diretos a tabelas de `mandato_testes`. Executado `GRANT mandato_cidadao_a TO mandato_api_homologacao` para habilitar `SET LOCAL ROLE` no executor.

Consulta de verificação em `pg_roles`, `pg_has_role` e `has_function_privilege` confirmou:
- LOGIN: sim; SUPERUSER: não; BYPASSRLS: não; CREATEROLE: não.
- Membro `mandato_cidadao_a`: sim; membro `mandato_admin_teste`: não.
- EXECUTE em `mandato_testes.decidir_recuperacao(bigint,boolean)`: não.

**Credencial não registrada no GitHub.** Configurar `DATABASE_URL` somente no servidor e `NEON_USUARIO_SERVICO_HOMOLOGACAO=mandato_api_homologacao`. Nunca publicar senha no frontend.

**Limites:** consulta de privilégios confirma metadados, mas ainda falta executar `SET LOCAL ROLE` e chamadas HTTP reais autenticadas com esta conta. Recuperação administrativa permanece desativada. A conta foi criada sem solicitar recurso computacional novo; não há comprovação de custo financeiro futuro.
