# Validação local HTTP e permissões Neon — 2026-11-08

Escopo: branch `feature/recuperacao-whatsapp-manual`, projeto Neon de testes `proud-firefly-64745516`, banco `neondb`. Nenhuma operação de escrita no banco.

## Testes efetivamente executados
- Node.js v22.16.0, comando `node --test *.test.mjs` sobre cópias locais dos arquivos `server.mjs`, `limitador.mjs`, `operacoes-neon.mjs`, `rota-decisao-metodos-regressao.test.mjs` e `http-neon-contrato.test.mjs`.
- TAP: 3 testes, 3 aprovados, 0 falhas, duração total 222,585 ms.
- Os testes HTTP usam executor SQL simulado. **Não são testes ponta a ponta HTTP–Neon** e não substituem a suíte completa do repositório.

## Neon real: consultas somente de leitura
- `SELECT current_user, has_function_privilege(...)` executado sob a role `mandato_api_homologacao`.
- `consulta_segura(text,text)`: EXECUTE permitido.
- `pedir_recuperacao(text,text)`: EXECUTE permitido.
- `decidir_recuperacao(bigint,boolean)`: EXECUTE negado.
- `registrar_decisao_sintetica_900007(text,text,text)`: EXECUTE permitido.
- `pg_get_functiondef` mostra que a função sintética é `SECURITY DEFINER`, restringe argumentos a valores fictícios fixos, atualiza evidência sintética e insere decisão de homologação. **Não foi invocada**, pois pode alterar dados mesmo com SELECT.

## Bloqueios para conclusão
1. Testar ponta a ponta HTTP → servidor Node → Neon com `DATABASE_URL` privado da conta restrita, sem expor segredos; não usar credenciais de proprietário.
2. Executar toda a suíte Node do repositório e obter resultado CI verificável.
3. Revisar e justificar ou revogar a permissão de execução da função sintética para a conta de API antes de liberar migração.
4. Validar autenticação administrativa real e plano de reversão, sem acionar produção.

Nenhuma alteração em Supabase de produção, dados reais, branch `main` ou permissões do Neon. Migração bloqueada.
