# Histórico protegido — especificação de homologação (não aplicado)

## Estado atual
O banco de testes `mandato_testes` não contém tabela de histórico de status. A V2 publicada utiliza o histórico da produção por protocolo sem chave. Não ligar a flag segura enquanto isso não estiver protegido.

## Proposta para implementação no banco de testes
1. Criar `mandato_testes.historico_status` com identificador interno, `solicitacao_id` como chave estrangeira para `mandato_testes.solicitacoes(id)`, `status`, `observacao` e `criado_em`. Conferir tipos e regras com o esquema existente antes de executar SQL.
2. Habilitar e forçar RLS, sem permissões de leitura direta para papéis cidadãos.
3. Criar função `consulta_historico_segura(p_protocolo text,p_chave text)` que primeiro valide o mesmo segredo usado em `consulta_segura`, sem revelar se protocolo existe. Restringir `EXECUTE` aos papéis previstos e definir `search_path` seguro.
4. Permitir no executor PostgreSQL apenas `SELECT * FROM mandato_testes.consulta_historico_segura($1,$2)`, com parâmetros vinculados.
5. A API deve retornar apenas `status`, `observacao` pública e `criado_em`, nunca IDs internos, nomes de responsáveis ou notas administrativas.
6. Exibir o histórico somente após validação de chave e não usar o RPC legado como fallback.

## Testes de aceitação
- Chave correta: eventos pertencentes apenas à solicitação correspondente, ordenados por data.
- Chave incorreta ou protocolo inexistente: zero eventos, sem indicar qual dado está errado.
- Protocolo de outro cidadão: zero eventos.
- Papel cidadão: sem `SELECT` direto na tabela e sem execução de funções administrativas.
- Nenhuma informação privada no corpo da resposta ou em logs.
- Falha do histórico: mensagem genérica, sem reativar consulta pública antiga.

**Bloqueio:** implementar e validar o esquema no banco de testes antes de alterar `operacoes-neon.mjs` e `v2/index.html`. Não executar migração na produção neste estágio.
