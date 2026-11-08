# Resultado da gravação restrita — Neon isolado, 08/11/2026

Projeto Neon: `proud-firefly-64745516`, base `neondb`, esquema `mandato_testes`.

## Instalado exclusivamente para dados sintéticos
- Tabela `evidencias_identidade_sinteticas_900007`, com restrições fixas para o caso fictício 900007, sem INSERT/UPDATE pela API.
- Função SECURITY DEFINER `registrar_decisao_sintetica_900007(text,text,text)`, com parâmetros fixos, sem booleanos fornecidos pelo chamador.
- A função consome a evidência e insere a decisão na mesma transação. Uma falha na inserção reverte o consumo.
- EXECUTE somente para `mandato_api_homologacao`; não concedido ao cidadão.

## Resultado de execução real no Neon
- Protocolo diferente: rejeitado com `Fora do escopo sintético`.
- Execução autorizada como `mandato_api_homologacao`: decisão ID **1** criada.
- Consulta posterior: **1 decisão** com `REG-TESTE-900007`, **1 evidência consumida**.
- Repetição do mesmo pedido: rejeitada com `Evidência ausente ou já consumida`.
- API sem INSERT direto na tabela de decisões ou escrita na tabela de evidências.
- Papel cidadão sem EXECUTE na RPC.

## Limites
Esta função é **exclusivamente para o caso fictício 900007** e não substitui a implementação operacional da verificação de identidade. A evidência foi pré-carregada sinteticamente pelo proprietário do banco, não por um conferente real. O fluxo HTTP real e a fonte de atestados externos ainda não estão conectados. Nenhuma alteração foi feita no Supabase de produção ou nos aplicativos públicos.

**Não reutilizar a função 900007 para cidadãos reais.** A proposta SQL genérica anterior continua não instalada.
