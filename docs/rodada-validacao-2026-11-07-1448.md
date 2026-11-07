# Rodada de validação — 2026-11-07, 14:48 BRT

## Alterações na branch exclusiva
- Adicionado `homologacao/api-neon/regressao-autorizacao-http.test.mjs` com **3 novos testes escritos, NÃO executados**: spoofing X-Forwarded-For/rate limit, decisão sem prova de identidade, falha fechada de verificação de token.
- Adicionado `docs/plano-migracao-segura-v2-2026-11-07.md` com portões de aceite, rollback e preservação de pedidos antigos.

## Teste SQL real executado
Projeto Neon isolado `proud-firefly-64745516`, login `mandato_api_homologacao`, transação `SET LOCAL ROLE mandato_cidadao_a`:
- Consulta segura `FICTICIO-A` com chave `b` x64 → 0 linhas.
- Consulta segura `FICTICIO-B` com chave `a` x64 → 0 linhas.

**Limitação crítica:** não há evidência de que os protocolos fictícios existam no banco; zero linhas **não prova isolamento entre dois registros existentes**. Não foram inseridos dados nem feitas alterações de produção.

## Bloqueios
- Execução da suíte Node na branch atual: não disponível nesta rodada via conector GitHub; acesso direto do container ao GitHub falhou por DNS. Nenhum teste HTTP novo deve ser anunciado como aprovado.
- HTTP real com driver `pg` conectado ao Neon ainda pendente.
- Prova de identidade para recuperação manual e migração de pedidos existentes ainda pendentes.

**Sem ativação**, sem dados reais, sem mudanças em `main` ou Supabase.
