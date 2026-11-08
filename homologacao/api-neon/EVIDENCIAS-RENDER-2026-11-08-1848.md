# Evidências de homologação — 2026-11-08 18:48 BRT

## Escopo
Somente branch `feature/recuperacao-whatsapp-manual`; serviço Render `mandato-neon-homologacao`. Banco Neon de testes designado: `proud-firefly-64745516`. Este registro é observacional: não executa SQL, não habilita funcionalidades e não modifica produção.

## Verificações efetivamente realizadas nesta execução
1. Consultada a lista de implantações do Render para o serviço `srv-dbno75c9v7es73daf170` (workspace `tea-dbnnlv49v7es73d96v70`).
2. Implantação `dep-dboeipcs728c73a4mtc0`, commit `3e61451ff7240ace69a7ddc5ee687fa7fa96ea58`, terminou `live` em 2026-11-08T21:30:52Z.
3. Consultados os logs de aplicação no intervalo 2026-11-08T21:30:40Z a 21:30:55Z: resumo da suíte `# tests 423`, `# pass 421`, `# fail 0`, `# skipped 2`, `# cancelled 0`.
4. Implantações intermediárias `dep-dboeevam5gnc73em1rrg`, `dep-dboedgrm5ojs7382aie0` e `dep-dboecpgqr7gs73atk2eg` apresentaram `update_failed`; a implantação posterior `live` não apaga esse histórico.

## Limites das evidências
O status `live` e a suíte automatizada não demonstram, por si, uma sessão administrativa humana com MFA, troca efetiva de chave por WhatsApp, invalidação da chave antiga ou teste ponta a ponta pela interface. Nenhuma nova chamada HTTP-Neon ou SQL foi executada nesta verificação. Não atribuir percentual de conclusão.

## Próxima validação (sem produção)
1. Investigar os dois testes ignorados e justificar ou habilitar execução em homologação.
2. Executar autenticação administrativa real em ambiente de testes com MFA recente e sessão legítima, sem compartilhar credenciais.
3. Verificar recuperação sintética: token WhatsApp confirmado por provedor, aprovação auditada, transação de chave e impossibilidade de reutilização da chave anterior.
4. Registrar evidências HTTP e SQL com identificadores sintéticos e sem segredos; preparar rollback antes de qualquer migração.

## Restrições
Não tocar Supabase de produção, dados reais ou branch `main`; não ativar segurança pública nem realizar operações com custo sem autorização.
