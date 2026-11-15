# Mapeamento de compatibilidade de produção — 15/11/2026

**Escopo:** inventário somente leitura no projeto Supabase `Solicitacoes-Mandato` (`pmmsdjozyyxkbuqlkfpb`). Nenhum DDL, DML, permissão ou configuração de produção alterado.

## Dados reais e armazenamento
- `public.solicitacoes`: `id bigint` PK, `protocolo text` UNIQUE mas nullable; 3 linhas sem protocolo, zero grupos de protocolos duplicados. Campos existentes: nome, whatsapp, localidade, assunto, descricao, status, resposta, anexos text[], datas, anotacao_interna, lembrete_em, latitude/longitude, encaminhamento.
- `public.respostas_solicitacoes`: `id bigint`, `solicitacao_id bigint` FK CASCADE, `mensagem text`, `anexos jsonb`, `criado_em timestamptz`; check exige mensagem ou anexo.
- `public.solicitacoes_status_historico`: `id bigint`, `solicitacao_id bigint` FK CASCADE, `status text`, `criado_em timestamptz`.
- Storage: 4 buckets; 60 objetos totais: `anexos-solicitacoes` 55 (privado); `documentos-respostas` 4 (**público**); `comprovantes-financeiros` 1 (privado); `conteudos-mandato` 0 (público). **Revisar se documentos-respostas pode conter informações pessoais antes de qualquer migração; não alterar visibilidade sem compatibilidade.**

## Segurança
- RLS habilitado nas três tabelas principais. Políticas administrativas são atribuídas ao papel `authenticated`; é necessário examinar os predicados `USING` e `WITH CHECK` e não presumir que o papel, sozinho, restringe a administradores.
- RPCs legadas `consulta_publica_protocolo(text)`, `consulta_publica_historico_protocolo(text)`, `consulta_publica_respostas_protocolo(text)` e `consultar_protocolo(text)` são `SECURITY DEFINER` e executáveis por `anon` somente com protocolo. **Bloqueador de privacidade para liberação definitiva**. Não revogar sem migrar os clientes.
- Advisor de segurança acusa funções públicas `SECURITY DEFINER` e `gerar_protocolo` com `search_path` mutável. Verificar separadamente, preservando funcionalidades públicas intencionais.

## Estratégia proposta (ainda não aplicada)
1. Backup + restauração isolada de PostgreSQL e todos os objetos Storage; inventário de integridade e comparação de contagens.
2. Preparar tabelas auxiliares privadas para segredo por solicitação (somente hash/HMAC, nunca chave em texto puro), recuperação e auditoria; chaves estrangeiras `bigint` para `solicitacoes.id`. Para as três solicitações sem protocolo, definir procedimento individual sem expor dados.
3. API privada e transacional para consultar por protocolo + chave com comparação segura, controle de tentativas e respostas mínimas; nunca expor segredo em logs/URL/QR. Planejar vinculação segura dos cidadãos antigos sem chave por verificação de identidade independente.
4. Reconciliar anexos `text[]` com Storage e `jsonb` de respostas, sem mover/excluir arquivos no primeiro release. Revisar bucket público de documentos-respostas.
5. Revisar as políticas administrativas e funções `SECURITY DEFINER`, confirmar MFA e autorização por usuário/escopo no servidor.
6. Lançamento controlado: publicar cliente que use nova API, bloquear RPCs legadas após checar consumidores e executar testes negativos. Monitorar e permitir rollback sem reabrir consulta só por protocolo.

## Critérios de aceite antes de ativar
- Backup restaurado; zero perda de solicitações, respostas, históricos e anexos.
- Consultas sem chave recusadas em todas as rotas públicas; consulta correta com chave aprovada; tentativas erradas limitadas.
- Recuperação com aprovação auditada, envio manual conferido, expiração em cinco minutos, uso único, rotação de chave; nenhum número ou código em logs.
- Permissões por identidade e MFA verificadas; anexos privados inacessíveis a terceiros.
- Compatibilidade V2/Painel/Android e plano de rollback testados.

**Estado:** inventário e plano preparados, sem implantação em produção.
