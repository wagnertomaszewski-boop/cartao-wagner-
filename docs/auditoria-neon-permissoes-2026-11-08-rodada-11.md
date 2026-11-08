# Auditoria somente leitura — Neon de homologação — 2026-11-08

Escopo: projeto Neon `proud-firefly-64745516`, banco `neondb`, esquema `mandato_testes`. Nenhuma consulta de escrita executada. Branch de registro: `feature/recuperacao-whatsapp-manual`.

## Consultas executadas

1. `SELECT current_database(), current_user, current_setting('server_version'), ...`: banco `neondb`, usuário `neondb_owner`, PostgreSQL `18.6 (ac70818)`. A contagem inicial de SECURITY DEFINER em `public` foi **0**, pois as funções da aplicação estão em outro esquema.
2. Inventário `pg_proc JOIN pg_namespace` excluindo esquemas do sistema: `mandato_testes` contém **14 funções**, todas `SECURITY DEFINER`.
3. `has_function_privilege('mandato_api_homologacao', oid, 'EXECUTE')`: **11 funções executáveis** pela conta da API, **3 bloqueadas**. As bloqueadas são `consulta_anexos_segura`, `criar_solicitacao_segura` e `decidir_recuperacao`.
4. `aclexplode(coalesce(proacl, acldefault('f', proowner)))` com `grantee=0`: **0 das 14 funções** concedem EXECUTE ao papel implícito PUBLIC.

## Achado que exige revisão

A conta `mandato_api_homologacao` pode executar as funções de teste `aprovacao_emissao_teste_900006`, `emitir_chave_legada_teste_900004`, `emitir_chave_legada_teste_900005`, `emitir_chave_legada_teste_900006` e `registrar_decisao_sintetica_900007`. Isso não demonstra exploração nem acesso indevido, mas **exige revisão do princípio do menor privilégio** antes de habilitar HTTP. Não revogar automaticamente: pode haver dependência dos testes existentes. Inspecionar os corpos, tabelas atingidas, guardas de identidade e necessidade operacional.

O inventário atual de 14 funções não deve ser comparado diretamente à auditoria anterior de 8 funções sem conferir data, escopo e alterações intermediárias.

## Limitações e critérios para próxima etapa

- As consultas foram feitas como `neondb_owner` para inspeção de catálogo, **não** representam teste de execução autenticada como `mandato_api_homologacao`.
- Nenhum teste HTTP-Neon real, isolamento entre protocolos, nem login administrativo ponta a ponta foi executado nesta rodada.
- Próxima etapa: executar suíte Node no commit exato; testar HTTP em ambiente isolado com credenciais restritas e dados sintéticos; verificar autorização cruzada e falha fechada; revisar grants das funções de teste; preparar rollback documentado.
- Não modificar Supabase de produção, dados reais, `main`, nem ativar nova segurança sem validação e autorização.
