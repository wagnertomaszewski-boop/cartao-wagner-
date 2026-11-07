# Execução real de banco — conta de serviço Neon — 2026-11-07

Projeto isolado `proud-firefly-64745516`, database `neondb`, role_name `mandato_api_homologacao`.

## Consultas efetivamente executadas
1. `SELECT current_user, session_user, has_function_privilege(...)`: ambos usuários = `mandato_api_homologacao`; consulta segura EXECUTE = `true`; decisão administrativa EXECUTE = `false`.
2. Transação sob a mesma conta com `SET LOCAL ROLE mandato_cidadao_a`: executado com sucesso.
3. Na mesma transação, `SELECT current_user, has_function_privilege(...)`: usuário efetivo = `mandato_cidadao_a`; consulta segura EXECUTE = `true`; decisão administrativa EXECUTE = `false`.
4. Na mesma transação, `SELECT * FROM mandato_testes.consulta_segura('PROTOCOLO-FICTICIO-INEXISTENTE','chave-ficticia-com-mais-de-trinta-e-dois-caracteres')`: retornou **zero linhas**, sem erro.

Nenhum dado foi inserido, atualizado ou apagado. Nenhum protocolo real foi usado. **Limite:** estes são testes SQL reais via conector Neon, não chamadas HTTP à API, não testes de senha da conta via driver `pg` e não testes de isolamento com dois pedidos fictícios existentes.

## Próxima etapa
Executar servidor HTTP com driver PostgreSQL real, conta restrita e credenciais exclusivamente no servidor; validar comportamento com dois pedidos fictícios e fluxo administrativo separado, sem ativação em produção.
