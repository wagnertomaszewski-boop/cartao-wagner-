# Tentativa de execução HTTP–Neon completa — 2026-11-07

**Resultado:** NÃO EXECUTADO ponta a ponta; bloqueio técnico confirmado. Não declarar a integração HTTP–Neon homologada.

## Testes executados nesta rodada
- `cd /mnt/data/v2-original-tests && node --test integracao-http-postgres.test.mjs limite-corpo-http.test.mjs`: **11 aprovados / 11 executados / 0 falhas**, Node v22.16.0. Os testes usam driver PostgreSQL simulado; os arquivos são cópias locais dos módulos e testes anteriormente recuperados do GitHub.
- SQL **real** via conector Neon, projeto `proud-firefly-64745516`, conta `mandato_api_homologacao`, `SET LOCAL ROLE mandato_cidadao_a`, `consulta_segura` com protocolo e chave fictícios: **0 registros**, execução bem-sucedida.

## Diagnóstico de conectividade
- `node -e "require.resolve('pg')"`: pacote `pg` não instalado.
- `socket.getaddrinfo` para `github.com`, `google.com` e hostname Neon de exemplo: `gaierror [Errno -3] Temporary failure in name resolution`.
- Sem DNS/saída de rede direta, não há como executar HTTP local com driver `pg` até o banco Neon, mesmo que se obtenha uma connection string. Não solicitar nem expor senha sem resolver a conectividade.
- O smoke test `homologacao/api-neon/smoke-http-neon-real.mjs` permanece preparado e **não executado**.

## Para desbloquear
Executar o smoke test num runner isolado com saída HTTPS/PostgreSQL, Node, `pg` instalado e secrets restritos (sem publicar logs de conexão), **somente** na branch de homologação. Não ativar rotas em produção.

Nenhuma alteração em Supabase, dados reais, `main` ou segurança pública do app.
