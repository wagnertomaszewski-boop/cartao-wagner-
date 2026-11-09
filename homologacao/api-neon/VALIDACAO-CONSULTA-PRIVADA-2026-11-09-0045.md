# Verificação de consulta privada — 2026-11-09 00:45 (America/Sao_Paulo)

## Escopo
Somente GitHub `feature/recuperacao-whatsapp-manual` e Neon `proud-firefly-64745516`, branch **não primária** `br-lively-snow-bev5ecau` (`homologacao-fiscalizacao-20261108`). A branch Neon padrão `production` não foi acessada. Nenhum dado real foi consultado; nenhuma alteração SQL ou ativação pública.

## Evidência de leitura de código e SQL
- Leitura direta de `homologacao/api-neon/server.mjs` (blob `4db508ae2e3d0707c6d701c70ee5939503f915b7`): `POST /api/solicitacoes/consultar` encaminha `dados` ao handler injetado; não valida protocolo e chave diretamente na camada HTTP.
- Consulta somente leitura a `pg_proc` identificou `mandato_testes.consulta_segura(p_protocolo text,p_segredo text)`, função `SECURITY DEFINER`, `search_path=''`, que exige protocolo igual, hash SHA-256 do segredo igual e comprimento mínimo de 32 caracteres. Retorna apenas `assunto` e `status`.
- A função usa comparação de hash simples, não um esquema de derivação lenta; avaliar entropia da chave, política de tentativas e privilégios antes de liberar.

## Testes SQL efetivamente executados (somente leitura)
```sql
SELECT 'protocolo_sem_chave' AS caso, count(*) AS linhas
FROM mandato_testes.consulta_segura('HML-NAO-EXISTE-20261109', NULL)
UNION ALL
SELECT 'chave_incorreta',count(*)
FROM mandato_testes.consulta_segura('HML-NAO-EXISTE-20261109', repeat('x',32))
UNION ALL
SELECT 'chave_curta',count(*)
FROM mandato_testes.consulta_segura('HML-NAO-EXISTE-20261109','curta');
```
Resultados observados: `protocolo_sem_chave=0`, `chave_incorreta=0`, `chave_curta=0` linhas. **Limite:** protocolo sintético inexistente não prova isolamento de solicitações existentes, nem revogação de chaves; são apenas testes negativos de ausência de resultado.

## Pendências / critérios de liberação
1. Com registro sintético existente, testar protocolo válido sem chave, chave errada, chave correta e chave revogada, verificando revogação atômica.
2. Auditar qual handler a implantação HTTP efetivamente injeta e qual papel restrito executa a função; testar HTTP–Neon ponta a ponta.
3. Testar MFA real, aprovação administrativa, WhatsApp manual, expiração, consumo único e auditoria; evitar habilitar em produção.
4. Preparar migração idempotente e reversível, com checagem de privilégios, backup lógico e ensaio apenas na branch de homologação.

Nenhuma suíte Node ou requisição HTTP foi executada nesta rodada; nenhum percentual de conclusão atribuído.
