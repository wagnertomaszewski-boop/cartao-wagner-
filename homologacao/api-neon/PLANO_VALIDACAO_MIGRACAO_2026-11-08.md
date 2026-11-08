# Plano de validação e migração — V2 / HTTP–Neon (somente homologação)

Data: 2026-11-08. Escopo autorizado: branch `feature/recuperacao-whatsapp-manual`, projeto Neon `proud-firefly-64745516`. **Este documento não autoriza implantação.**

## Evidências verificadas nesta rodada
- Branch de trabalho encontrada no GitHub.
- `homologacao/api-neon/package.json`: Node >=22 <23; `npm test` executa `node --test *.test.mjs`; dependência `pg@8.16.3`.
- `homologacao/api-neon/servico-https.mjs`: inicialização via `iniciarHomologacao`, validação da porta e encerramento com limpeza; arquivo examinado por leitura, **não** testado em execução.
- Consulta SQL **somente leitura** no Neon: `SELECT current_database() AS db, current_user AS role, count(*) AS function_count FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='mandato_testes';`. Resultado: `neondb`, `neondb_owner`, 14 funções. Não representa teste com papel restrito.

## Portões obrigatórios antes de qualquer ativação
1. **Baseline reproduzível**: registrar SHA exato da branch, execução do `npm test`, total aprovado/falhado, logs sem segredos e link do GitHub Actions. Não declarar aprovação com base apenas na presença dos arquivos.
2. **Privilégio mínimo**: enumerar permissões EXECUTE para `mandato_api_homologacao` e PUBLIC por assinatura de função. Revisar as cinco funções auxiliares apontadas anteriormente; testar bloqueio de operações administrativas como papel restrito. Não alterar GRANT/REVOKE sem revisão separada.
3. **Autenticação HTTP**: exercitar requisições sem token, token inválido/expirado, origem não permitida, preflight, método inesperado, repetição e autorização entre solicitações distintas. Confirmar resposta e ausência de efeito no banco usando identificadores fictícios.
4. **Integração HTTP–Neon**: usar URL de homologação e credenciais exclusivas de baixo privilégio, nunca credenciais owner em servidor exposto. Executar caso positivo e negativos; correlacionar request-id e auditoria sem armazenar tokens, CPF ou chaves em logs.
5. **Isolamento**: comparar contagens e registros fictícios antes/depois; validar transação, falha de auditoria e comportamento fail-closed; não tocar em produção Supabase.
6. **Migração proposta, não executada**: inventário de dependências e contratos API, backups e restauração ensaiados apenas em ambiente de teste, roteiro de rollback, observabilidade e aprovação humana expressa para cada mudança de produção. Sem cutover ou ativação nesta branch.

## Critérios de bloqueio
Qualquer falha de autorização, exposição de função auxiliar, teste sem evidência reproduzível, credencial privilegiada na API, divergência de dados ou ausência de rollback impede ativação. Resultados pendentes não contam como testes aprovados.

## Próxima execução segura
Executar a suíte Node no GitHub Actions da branch autorizada e registrar logs; depois validar HTTP em ambiente isolado, com papel restrito e dados sintéticos. Esta rodada **não executou** Node, HTTP, migração ou alterações SQL.
