# Validação real Neon — 2026-11-08

Ambiente consultado: projeto Neon `proud-firefly-64745516`, banco `neondb`.
Consultas executadas via conexão SQL **somente leitura**. Nenhuma tabela criada,
nenhum registro alterado e nenhuma chave real emitida.

## Evidência observada

- PostgreSQL **18.6**, usuário da inspeção `neondb_owner`.
- `to_regclass('mandato_testes.solicitacoes')` → existe.
- `to_regclass('public.solicitacoes')` → **NULL**.
- `to_regclass('mandato_privado.chaves_acompanhamento')` → **NULL**.
- A tabela sintética `mandato_testes.solicitacoes` tem colunas
  `id`, `cidadao_id`, `assunto`, `descricao`, `status`, `criado_em`.
  **Não possui `protocolo`**.

## Resultado

**BLOQUEADO PARA TESTE SQL INTEGRADO REAL.**
A consulta em `consulta-chave-privada.mjs` usa
`public.solicitacoes.protocolo` e
`mandato_privado.chaves_acompanhamento`. Essas estruturas não existem
no Neon de homologação. Os testes HTTP com banco simulado não substituem
a validação de PostgreSQL, RLS, permissões e revogação reais.

## Próxima execução controlada

1. Preparar DDL sintético específico para homologação, sem dados de cidadãos,
   com protocolo de teste e tabela de hashes.
2. Revisar papéis, privilégios, RLS e transação antes de aplicar DDL em Neon.
3. Solicitar autorização específica para criar a estrutura sintética de teste.
4. Executar emissão, consulta, erro de chave, conflito e revogação no banco real.
5. Não tocar no Supabase de produção nem promover alterações à branch principal.

Observação: a migração candidata de produção **não deve** ser executada
diretamente nesse Neon, pois referencia `public.solicitacoes`, inexistente.
