-- Auditoria somente leitura. Executar exclusivamente no Neon de testes proud-firefly-64745516.
-- Gate de migração: quatro funções legadas não devem ser executáveis pela conta HTTP; a RPC sintética 900007 é exceção necessária para homologação isolada.
-- Não executa as funções, não altera privilégios nem dados.
WITH auxiliares(nome) AS (
 VALUES ('aprovacao_emissao_teste_900006'),('emitir_chave_legada_teste_900004'),
 ('emitir_chave_legada_teste_900005'),('emitir_chave_legada_teste_900006'),
 ('registrar_decisao_sintetica_900007')
), auditoria AS (
 SELECT a.nome, count(p.oid) AS variantes,
        count(p.oid) FILTER (WHERE has_function_privilege('mandato_api_homologacao',p.oid,'EXECUTE')) AS executaveis_api,
        count(p.oid) FILTER (WHERE EXISTS (
          SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
          WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE')) AS executaveis_publico
 FROM auxiliares a LEFT JOIN pg_proc p ON p.proname=a.nome
 LEFT JOIN pg_namespace n ON n.oid=p.pronamespace AND n.nspname='mandato_testes'
 WHERE p.oid IS NULL OR n.oid IS NOT NULL
 GROUP BY a.nome
)
SELECT nome, variantes, executaveis_api, executaveis_publico,
 CASE WHEN variantes=0 THEN 'REVISAR_FUNCAO_AUSENTE'
      WHEN executaveis_publico>0 THEN 'BLOQUEIA_MIGRACAO'
      WHEN nome='registrar_decisao_sintetica_900007' AND executaveis_api=1 THEN 'APROVADO_SOMENTE_HOMOLOGACAO'
      WHEN nome='registrar_decisao_sintetica_900007' THEN 'REVISAR_RPC_SINTETICA'
      WHEN executaveis_api>0 THEN 'BLOQUEIA_MIGRACAO'
      ELSE 'APROVADO_PERMISSOES' END AS resultado
FROM auditoria ORDER BY nome;
