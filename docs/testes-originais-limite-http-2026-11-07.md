# Execução de testes originais de HTTP — 2026-11-07

Origem dos testes: conteúdo integral de `homologacao/api-neon/limite-corpo-http.test.mjs` lido pelo conector GitHub na branch `feature/recuperacao-whatsapp-manual` e copiado localmente sem alterar as asserções. Dependências `server.mjs` e `limitador.mjs` reconstruídas localmente a partir do código consultado; não é checkout byte a byte do repositório.

Comando: `cd /mnt/data/v2-original-tests && node --test limite-corpo-http.test.mjs` (Node v22.16.0).

Resultado TAP: **3 testes, 3 aprovados, 0 falhas, duração 103,436704 ms**.

1. Requisição acima de 4096 bytes: 413 e handler não executado.
2. JSON pequeno: 200, resultado `{ok:true}`, handler uma vez.
3. `requestTimeout=10000`, `headersTimeout=5000`, `maxHeadersCount=64`.

Limitações: ainda não executados os testes originais restantes, nem conexão HTTP com Neon real; terminal não resolve `github.com` e não foi possível clonar. Nenhuma alteração em Supabase, produção, dados reais ou `main`.
