# Verificação pontual — 2026-11-08 23:41 America/Sao_Paulo

## Escopo e evidências
- Repositório: wagnertomaszewski-boop/cartao-wagner-, exclusivamente `feature/recuperacao-whatsapp-manual`.
- Leitura direta de `homologacao/api-neon/server.mjs` (blob `4db508ae2e3d0707c6d701c70ee5939503f915b7`) e `recuperacao-corpo-negativo-20261108.test.mjs` (blob `dcad939fb39ad1014760a0c21aceacf072848495`).
- Neon: projeto `proud-firefly-64745516`, **somente** branch não primária `br-lively-snow-bev5ecau` (`homologacao-fiscalizacao-20261108`), estado `ready`. A branch primária se chama `production` e **não foi consultada**.
- SQL somente leitura executado: `SELECT current_database(), current_user, current_setting('transaction_read_only'), version()` e listagem de nomes de tabelas em `information_schema.tables`. Conexão retornou banco `neondb`, papel `neondb_owner`, PostgreSQL 18.6. Nenhuma leitura de linhas com dados pessoais; nenhuma alteração SQL.
- Foram encontrados esquemas `auth_admin_hml`, `fiscalizacao_homologacao` e `mandato_testes`, inclusive tabelas de auditoria, MFA, recuperação e chaves. Existência não comprova comportamento ou integração HTTP.

## Achados de revisão estática
1. O servidor verifica token administrativo e MFA injetado para rotas sensíveis, mas isso **não comprova** validação real do provedor de identidade: verificar configuração concreta dos handlers e sessão MFA.
2. `POST /api/solicitacoes/consultar` repassa o objeto JSON ao handler sem impor na camada HTTP a presença de protocolo **e** chave. A obrigatoriedade de chave depende do handler de banco, que precisa ser auditado e testado; não liberar consulta pública com base só neste código.
3. O limitador usa `req.socket.remoteAddress` e é descrito como local no próprio código. Atrás de proxy, múltiplos cidadãos podem compartilhar o mesmo endereço; planejar limite distribuído antes da produção.
4. Testes de corpo inválido existem no repositório, mas **não foram executados nesta verificação**.

## Próximos passos / critérios de liberação
- Auditar o handler SQL de consulta e testar negativamente protocolo sem chave, chave incorreta e chave revogada, sempre com dados sintéticos.
- Testar recuperação integral: aprovação administrativa, MFA real, emissão de código temporário, expiração, consumo único, revogação atômica da chave anterior e trilha de auditoria.
- Validar HTTP–Neon em homologação com papel restrito; não usar `neondb_owner` na API.
- Elaborar migração idempotente com backup lógico, ensaio na branch de testes, checagens pós-migração e rollback; nenhuma migração aplicada nesta execução.
- Não habilitar segurança pública sem evidência dos testes e autorização expressa.

## Resultado desta verificação
**Executados:** 2 leituras de arquivos no GitHub, consulta de branches, 2 consultas SQL somente leitura no Neon de homologação. **Não executados:** testes automatizados Node, requisições HTTP ao serviço Render, migrações, alterações de credenciais ou dados. Sem porcentagem de conclusão.
