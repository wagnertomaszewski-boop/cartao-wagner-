# Inventário de pré-implantação — 15/11/2026

**Estado: somente leitura em produção; nenhuma migração aplicada.**

## Ambiente identificado
- Supabase de produção: projeto `Solicitacoes-Mandato`, ref `pmmsdjozyyxkbuqlkfpb`, região `sa-east-1`, ativo.
- Homologação: Render `mandato-neon-homologacao` com Neon isolado. Não promover o serviço de HML como API de produção.
- Inventário de produção por ferramentas Supabase em modo leitura: `public.solicitacoes` 43 linhas estimadas; `public.respostas_solicitacoes` 10; `public.solicitacoes_status_historico` 86. São estimativas do catálogo, não reconciliação nem backup.
- Tabelas citadas possuem RLS habilitado. A tabela `solicitacoes` utiliza ID bigint e protocolo text; respostas e histórico referenciam `solicitacao_id` bigint. O modelo HML não deve ser copiado cegamente.

## Bloqueio de segurança confirmado
- Funções `public.consulta_publica_protocolo(text)`, `public.consulta_publica_historico_protocolo(text)`, `public.consulta_publica_respostas_protocolo(text)` e `public.consultar_protocolo(text)` são SECURITY DEFINER e executáveis por `anon` e `authenticated`, aceitando somente protocolo.
- O fluxo novo exige protocolo + chave. **Não revogar ainda**: identificar todos os clientes que chamam as funções, preparar adaptador seguro, fazer migração compatível e teste negativo antes da troca. Após ativação controlada, remover EXECUTE público das funções legadas e confirmar que nenhum endpoint alternativo permite consulta por protocolo isolado.
- Advisor de segurança Supabase também sinalizou funções SECURITY DEFINER públicas e `gerar_protocolo` com search_path mutável. Revisão separada; não revogar funções de cadastro/agenda indiscriminadamente.

## Gates para a implantação
1. Identificar cliente cidadão publicado, Painel e origens HTTP efetivas; confirmar assinatura/keystore e versionCode para Android, sem substituir apps.
2. Inventariar buckets Storage, policies, RPCs, funções, constraints, triggers, duplicidades de protocolo e vínculos; conferir os dados apenas de forma agregada.
3. Backup consistente de produção (Postgres **e** Storage), restauração isolada e reconciliação verificável antes de qualquer DDL.
4. Escrever migrações aditivas específicas para esquema bigint existente, compatíveis com protocolo/chave, recuperação, auditoria e respostas, sem reescrever dados legados.
5. Implementar backend de produção separado de HML, com credenciais mínimas, MFA administrativo, controles de acesso, limites e auditoria.
6. Testes negativos: protocolo sem chave, chave incorreta/revogada, anexos de terceiro, código expirado/reutilizado, sessão admin sem MFA; testes positivos de criação/status/resposta e recuperação.
7. Preparar rollback que **não** reabra consulta insegura nem apague novas solicitações.
8. Revisar artefatos e obter autorização específica para executar migrações, mudança de rotas e publicação.

**Autorização atual:** preparar sobre a estrutura existente, mantendo alterações desativadas. Não autoriza alterar dados, executar DDL, mudar RPCs em produção ou publicar Play Store.
