# Correção planejada das consultas por protocolo — Supabase de produção

**Estado: SOMENTE PROPOSTA. NÃO EXECUTAR EM PRODUÇÃO.**

Inventário de leitura realizado em `Solicitacoes-Mandato` (`pmmsdjozyyxkbuqlkfpb`), novembro de 2026.

## Exposição identificada
As seguintes funções em `public` usam `SECURITY DEFINER`, aceitam apenas o protocolo e estão executáveis pelo papel `anon`:
- `public.consulta_publica_protocolo(text)` — retorna assunto, descrição, localidade, status e nome abreviado;
- `public.consulta_publica_historico_protocolo(text)` — retorna histórico de status;
- `public.consulta_publica_respostas_protocolo(text)` — retorna mensagem e JSON de anexos;
- `public.consultar_protocolo(text)` — retorna assunto, descrição, localidade e status.

**A RLS está ativa nas tabelas principais, mas SECURITY DEFINER pode contornar suas políticas.**
Não houve teste com dados de cidadãos nem modificação do banco.

## Ordem obrigatória
1. Mapear todas as chamadas dessas quatro RPCs nos clientes V2, Mandato em Ação e Painel do Mandato.
2. Criar mecanismo de autenticação por protocolo + chave, compatível com os registros existentes, com emissão e recuperação verificadas.
3. Validar no ambiente de testes o bloqueio de acesso sem chave, a consulta legítima, histórico e anexos privados.
4. Planejar janela e comunicação; preparar rollback que **não reabra dados privados**.
5. Após autorização específica para produção, aplicar restrição de `EXECUTE` às quatro funções antigas ou substituí-las por rotas autenticadas. **Não basta retirar de anon se PUBLIC continuar com EXECUTE**; conferir privilégios efetivos após a alteração.
6. Testar a versão publicada do cliente e os fluxos reais sem expor dados de cidadãos.

## SQL de referência para futura revisão humana — NÃO EXECUTAR
```sql
-- Modelo de contenção: só após migração e autorização explícita.
-- Verificar também dependências dos clientes e concessões a outros papéis.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.consulta_publica_protocolo(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consulta_publica_historico_protocolo(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consulta_publica_respostas_protocolo(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consultar_protocolo(text) FROM PUBLIC, anon, authenticated;
-- Conferir privilégios efetivos e disponibilidade antes de COMMIT.
ROLLBACK;
```

**Não executar esse SQL diretamente no banco real:** ele é um rascunho para ensaio e revisão, não uma migração aprovada.

## Critérios de aprovação
- Nenhuma das quatro funções permite consulta anônima sem chave.
- Protocolo isolado não expõe descrição, localização, mensagens, anexos ou identidade.
- Cidadão legítimo com protocolo antigo tem caminho de acesso seguro.
- Nenhuma chave, número de telefone ou documento é registrado em logs.
- Painel administrativo continua funcional com autorização de servidor.
- Rotas de envio de solicitações, agenda e projetos continuam funcionando.

## Inventário reconfirmado em 19/11/2026

| Caminho | Dependência e impacto |
| --- | --- |
| Mandato em Ação legado | `acompanhar.html` ainda chama a RPC de resumo sem chave. O acompanhamento legado deixa de funcionar se a RPC for revogada antes da atualização do cliente. Confirmar a versão efetivamente entregue pelo aplicativo Android antes da transição. |
| V2 | `v2/index.html` e os snapshots `app-v2-1422.html`, `app-v2-1708.html` e `app-v2-1718.html` contêm chamadas legadas. No host isolado o V2 encaminha para `/hml/v2/recuperar`. A página dedicada `v2/acompanhar.html` exige chave e teve as funções legadas inativas removidas no código. |
| Painel | Os caminhos administrativos leem tabelas sob políticas administrativas ou usam endpoints autenticados. O Painel de recuperação isolado exige sessão e MFA recente para as operações de recuperação. |
| API | A consulta de homologação usa protocolo e chave sobre o Neon. A API isolada `mandato-api-producao` ainda não integra o fluxo completo de consulta e recuperação. O backend candidato consultado no ensaio usa dados fictícios. |
| Supabase | A leitura anônima direta das tabelas de solicitações, status, respostas e fiscalização está desabilitada e a RLS está ativa. As quatro RPCs SECURITY DEFINER têm EXECUTE efetivo para anon e authenticated. O bucket `documentos-respostas` está público e requer transição separada para downloads autenticados, inclusive para links antigos. |

Os scripts de contenção foram ensaiados no PostgreSQL local com funções e dados fictícios. O ensaio preserva a consulta pelo papel privado explícito no rascunho e o bucket de conteúdo público no ensaio candidato. Antes de aplicar em produção, validar a versão publicada dos aplicativos, acesso a respostas e anexos para cidadãos com chave, rotas do Painel e emissão de chave para solicitações antigas.

Em caso de indisponibilidade durante a transição, colocar o acompanhamento afetado em manutenção ou retornar a uma versão com autenticação equivalente. Manter a revogação das RPCs públicas e o bucket de documentos privado após a contenção. Consultar o [procedimento de migração e reversão](PROCEDIMENTO-MIGRACAO-REVERSAO-PRODUCAO.md).
