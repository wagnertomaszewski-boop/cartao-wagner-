# Revisão de segurança V2 — 2026-11-08 22h40 (America/Sao_Paulo)

## Escopo e evidências desta execução
- Branch GitHub consultada: `feature/recuperacao-whatsapp-manual` (existência confirmada por busca de branches).
- Arquivos lidos diretamente nessa branch: `homologacao/api-neon/server.mjs`, `package.json`, `recuperacao-corpo-negativo-20261108.test.mjs`.
- Neon consultado em modo leitura: projeto `proud-firefly-64745516` (nome `mandato-em-acao-testes`). Branches observadas: `production` (padrão) e `homologacao-fiscalizacao-20261108` (não padrão).
- Render: consulta a serviços **não realizada**, pois o conector exige workspace previamente selecionado e não há confirmação de qual workspace usar. Não foi escolhido um workspace arbitrário.

## Constatações estáticas (não equivalem a testes executados)
1. `server.mjs` bloqueia por padrão handlers não injetados (503), exige Bearer e `verificarAdmin` para rotas administrativas, exige `verificarMfaOperacao` para iniciar/concluir recuperação, e limita corpo POST a 4096 bytes.
2. O endpoint `/api/admin/chaves/concluir-recuperacao` depende do handler injetado `concluirRecuperacao`. A conferência de identidade e a invalidação da chave antiga **não podem ser comprovadas apenas por esse arquivo**; precisam ser verificadas na implementação do handler e por testes integrados.
3. A checagem de origem CORS não é autenticação: requisições sem header `Origin` continuam dependendo da autenticação Bearer e MFA. Testar também clientes HTTP diretos.
4. O limitador usa `req.socket.remoteAddress` e o próprio comentário do código informa que é apenas local; implantação atrás de proxy exige análise de limite distribuído, sem confiar cegamente em `X-Forwarded-For`.
5. O teste `recuperacao-corpo-negativo-20261108.test.mjs` contém três casos negativos (415, 400, 413) e verifica que o handler não é chamado. A leitura do código **não comprova execução nem aprovação**.

## Bloqueios / próximos passos verificáveis
1. Identificar e auditar o handler real `concluirRecuperacao`: exigir vínculo entre solicitação, prova WhatsApp, conferência de identidade, MFA recente, consumo único do desafio, transação atômica e auditoria sem registrar segredos.
2. Rodar `npm test` no ambiente Node 22 isolado, anexando saída e SHA do commit; não contabilizar testes pela mera presença dos arquivos.
3. Validar HTTP–Neon somente na branch de homologação explicitamente selecionada, com dados sintéticos, credencial restrita e consultas de leitura antes de qualquer migração.
4. Preparar migração reversível (DDL idempotente, inventário de permissões, verificação antes/depois, rollback) sem executar SQL em `production` do Neon nem no Supabase.
5. Confirmar workspace Render antes de consultar implantações; status `live` não substitui resultado de testes.

## Operações desta execução
Somente leituras GitHub/Neon e criação deste relatório na branch autorizada. Nenhum teste automatizado/HTTP/SQL executado; nenhuma migração, rotação de senha, ativação pública ou alteração de produção realizada.
