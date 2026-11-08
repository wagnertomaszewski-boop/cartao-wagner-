# Plano de migração segura da recuperação de acesso — 2026-11-08

**Escopo restrito:** branch `feature/recuperacao-whatsapp-manual`, Neon de testes `proud-firefly-64745516`, API de homologação. Este documento não autoriza execução, não habilita recuperação pública e não altera Supabase de produção.

## Evidência disponível e limites

- Relatório `RELATORIO-HTTP-NEON-2026-11-08.md`: autoteste HTTP→PostgreSQL→RPC de **consulta sem correspondência** com status 200, às 18:43:26 UTC. Não demonstra emissão de chave, autorização de operador ou consulta de solicitação existente.
- Render: deploy `dep-dbodocdg1s2s738ef050` do commit `ba05f3b4` ficou `live` às 20:34:24 UTC. Logs desse deploy indicaram `# fail 0`. A aprovação de commits posteriores precisa ser verificada separadamente.
- Código do emissor exige evidência estruturada de WhatsApp, conferência pessoal e reautenticação recente; **não há ainda integração comprovada** de origem confiável para esses três atributos. Atestados não podem ser emitidos a partir de flags enviadas pelo navegador.

## Pré-condições obrigatórias (não atendidas por este plano)

1. Identificar de maneira não sensível a branch Neon de testes efetivamente usada pelo Render; confirmar roles e privilégios mínimos sem registrar senhas, tokens, chaves privadas ou URLs com credenciais.
2. Vincular conferência pessoal a um registro persistente e auditável, criado por administrador autenticado e autorizado. Registrar apenas metadados mínimos, sem exigir upload de documentos.
3. Validar confirmação WhatsApp no servidor por desafio de uso único, com expiração e rate limit distribuído; não aceitar `confirmacaoWhatsapp: true` vindo do cliente.
4. Exigir reautenticação recente do administrador, comprovada pelo provedor de autenticação, não por checkbox ou token antigo; vincular operador, solicitação e ação.
5. Assinar atestado Ed25519 apenas no serviço privado, após consulta às três provas confiáveis; manter chave privada exclusivamente no armazenamento secreto.
6. Consumir nonce e desafio de WhatsApp atomicamente com a troca de chave e auditoria, na mesma transação Neon; impedir replay e corrida entre requisições simultâneas.

## Testes obrigatórios em ambiente isolado

- Autenticação: sem token, token expirado, usuário não permitido, reautenticação antiga, sessão legítima.
- Autorização: pedido de outro cidadão, protocolo correto com WhatsApp incorreto, operador divergente, ação divergente, conferência negada.
- Criptografia: assinatura adulterada, atestado expirado, nonce reutilizado, duas solicitações concorrentes.
- HTTP: CORS indevido, corpo inválido ou excessivo, rate limit, ausência de informação sensível em erros e logs.
- Banco: apenas registros sintéticos criados para homologação; chave antiga deixa de consultar, chave nova consulta somente a solicitação autorizada; auditoria exatamente uma vez; rollback em erro antes do commit.
- Interface: abrir painel autenticado com conta administrativa legítima, visualizar pedido sintético, negar e aprovar em cenários separados, confirmar ausência de documentos e de exposição de chave em logs.

## Estratégia de migração e reversão

**Fase 0 — somente leitura:** inventariar esquema, roles, migrações e configurações no Neon de testes. Guardar resultados sanitizados e hashes dos scripts.

**Fase 1 — migração aditiva em branch Neon isolada:** após aprovação específica, aplicar tabelas/índices/funções novas sem remover nem renomear objetos existentes. Verificar privilégios e integridade com transação e testes sintéticos. Não importar dados reais.

**Fase 2 — homologação ponta a ponta:** configurar segredos apenas no servidor, executar casos positivos e negativos e registrar commit, deploy, horários, resultados e eventuais falhas. Manter flags de emissão/desbloqueio públicas desativadas.

**Fase 3 — proposta de ativação:** apresentar evidências, riscos e procedimento de recuperação manual ao responsável. Qualquer ativação ou migração de produção requer autorização posterior, separada e explícita.

**Rollback:** enquanto não houver ativação, manter flags desligadas e reverter o deploy para o último commit aprovado. Para migrações aditivas de teste, preferir abandonar a branch isolada após validar que não contém dados reais; não executar DROP/DELETE automaticamente. Em caso de erro de autenticação ou privilégio, parar a etapa e preservar logs sanitizados.

## Bloqueios atuais

Faltam evidência de reautenticação administrativa recente, provedor confiável para confirmação WhatsApp e conferência manual persistida, e teste E2E com sessão legítima. Nenhuma dessas verificações pode ser substituída por mocks para declarar produção pronta.
