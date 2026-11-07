# Contorno DNS e validação local — 2026-11-07

O terminal não resolve `github.com` por DNS, portanto `git clone` não funciona. A integração GitHub conectada permite ler e alterar arquivos sem esse DNS. Não houve correção da infraestrutura DNS.

## Execução efetiva
Reconstruído localmente o conteúdo funcional da versão atual de `homologacao/api-neon/iniciar-homologacao.mjs` obtido pelo conector GitHub, com dependências importadas substituídas por **stubs** (servidor, autenticação, operações e executor). Node v22.16.0: `node --test validar.test.mjs`, **7 testes executados, 7 aprovados, 0 falhas**:
1. Bloqueia `neondb_owner`.
2. Bloqueia `cloud_admin`.
3. Bloqueia usuário remoto arbitrário.
4. Bloqueia `sslmode=no-verify`.
5. Bloqueia `sslrootcert` na URL remota.
6. Conta remota restrita recebe TLS `{rejectUnauthorized:true}`.
7. `localhost` usa SSL desativado para teste local.

**Limitação importante:** estes testes usam cópia local da lógica de inicialização e dependências simuladas; não são a execução da suíte completa do repositório nem integração HTTP/Neon real. Não há credenciais ou dados reais.

## Próximo bloqueio
Ainda falta execução integral do teste HTTP/Postgres com driver real, conexão Neon por rede, e isolamento entre dois pedidos fictícios. DNS do terminal continua indisponível, mas o acesso ao GitHub por conector está operacional.

Escopo respeitado: branch `feature/recuperacao-whatsapp-manual`, sem mudanças em Supabase, produção ou `main`.
