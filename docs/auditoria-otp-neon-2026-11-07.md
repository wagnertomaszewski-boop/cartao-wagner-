# Auditoria da migração OTP no Neon de testes — 2026-11-07

**Escopo:** branch `feature/recuperacao-whatsapp-manual`, projeto Neon `proud-firefly-64745516`. Sem execução de DDL ou alteração de registros.

## Evidência executada
Consulta de metadados somente leitura:
```sql
SELECT table_name,column_name,data_type
FROM information_schema.columns
WHERE table_schema='mandato_testes'
  AND table_name IN ('solicitacoes','desafios_recuperacao')
ORDER BY table_name,ordinal_position;
```
Resultado: `mandato_testes.solicitacoes.id` é `bigint`; não retornou colunas de `desafios_recuperacao`. Portanto, a chave estrangeira proposta possui tipo compatível, mas a tabela de desafios **não foi encontrada por essa consulta** (ausente ou invisível ao papel consultante). Não afirmar migração aplicada.

## Bloqueios de segurança antes de qualquer DDL
1. O rascunho usa `FORCE ROW LEVEL SECURITY` sem política e revoga `PUBLIC`: a ausência de acesso é desejada por padrão, mas não existe caminho de acesso autorizado para o serviço. Criar papel mínimo e mecanismo transacional auditado antes de habilitar emissão.
2. `CREATE TABLE IF NOT EXISTS` não garante que uma tabela preexistente tenha estrutura ou políticas corretas; validar esquema, constraints, grants e políticas explicitamente.
3. `ON DELETE CASCADE` em desafios requer decisão explícita de retenção/auditoria; preferir não apagar evidência de recuperação inadvertidamente.
4. O protótipo usa `Map` em memória e `confirmarInternamente` não implementa autorização nem entrega de credencial; não conectar diretamente a endpoint público.
5. Não há prova de integração HTTP–Neon real, teste de restauração, execução da suíte original ou fluxo manual completo.

## Próximo passo seguro
Preparar migração revisada e testes em transação isolada com dados sintéticos; somente depois avaliar execução no Neon de testes. Manter as flags desligadas e não alterar Supabase de produção.
