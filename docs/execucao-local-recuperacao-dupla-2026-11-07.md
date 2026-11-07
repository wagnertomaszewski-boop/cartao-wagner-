# Execução local — recuperação dupla — 2026-11-07

## Origem e ambiente

Três arquivos foram lidos individualmente do GitHub na branch `feature/recuperacao-whatsapp-manual`: `homologacao/api-neon/server.mjs`, `limitador.mjs` e `recuperacao-dupla-seguranca.test.mjs`. Por indisponibilidade de DNS para `github.com` no contêiner, não houve `git clone` nem checkout verificável do commit; o conteúdo lido foi transcrito para cópias locais. Versão Node: `v22.16.0`.

Comando: `node --test /mnt/data/v2-test-local/recuperacao-dupla-seguranca.test.mjs`.

## Resultado observado

TAP: `1..5`; `# tests 5`; `# pass 5`; `# fail 0`; `# duration_ms 507.137094`.

Passaram: rotas de confirmação/envio de código não expostas (404); solicitação sem integração (503); decisão manual sem autenticação (401) ou identidade verificada (403); recusa de identidade sem permissão administrativa (403); recusa de declaração de identidade enviada apenas pelo cliente (403).

## Limitações

A execução **não é a suíte original completa nem checkout verificável**. Não testa WhatsApp real, código OTP, API–Neon real, persistência, frontend ou produção. A rota automática permanece não implementada. Nenhuma mensagem foi enviada, nenhum banco foi modificado e nenhuma mudança foi publicada.
