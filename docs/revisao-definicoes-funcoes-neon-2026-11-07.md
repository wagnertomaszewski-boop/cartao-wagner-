# Revisão de definições SQL — Neon isolado — 2026-11-07

Consulta somente leitura a `pg_get_functiondef` de seis funções no esquema `mandato_testes`, projeto `proud-firefly-64745516`, além de inspeção de metadados das oito funções.

## Confirmado
- Oito funções são `SECURITY DEFINER`, com owner `neondb_owner` e `search_path` vazio.
- `consulta_segura`, `consulta_respostas_segura`, `consulta_historico_segura`, `consulta_nomes_anexos_segura` exigem protocolo e comparação de hash SHA-256 da chave (mínimo de 32 caracteres). Projeções retornam campos limitados; histórico exige `visivel_cidadao IS TRUE`.
- `pedir_recuperacao` compara WhatsApp normalizado, cria pedido pendente quando não houver pedido recente e retorna sempre `true`; **comparar telefone não comprova posse do WhatsApp**.
- `decidir_recuperacao` usa `FOR UPDATE` para travar pedido pendente e substitui hash de chave quando aprovado, **retornando a chave em texto ao chamador**. A função SQL não verifica por si só a identidade administrativa: depende de autorização externa e de `EXECUTE` restrito.

## Bloqueios antes da produção
1. Revisar grants efetivos, função owner, políticas RLS e execução com papel restrito; owner privilegiado de SECURITY DEFINER amplia risco.
2. Impedir exposição da chave retornada em logs e respostas não autorizadas; exigir confirmação administrativa real e entrega segura ao titular.
3. Recuperação automática precisa prova de posse do canal, não apenas correspondência de telefone.
4. Verificar que observações históricas `visivel_cidadao` não contenham informações internas; anexos privados nunca devem ser retornados por caminho.
5. Executar testes HTTP–Neon reais e suíte original em checkout verificável.

Nenhum SQL de escrita, GRANT, função ou dado foi alterado nesta auditoria. Não é aprovação de segurança em produção.
