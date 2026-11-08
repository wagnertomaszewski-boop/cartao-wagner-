# Inventário real e bloqueios de pré-produção — 2026-11-08

**Origem:** consultas SQL somente leitura no Supabase de produção `Solicitacoes-Mandato` (`pmmsdjozyyxkbuqlkfpb`). **Nenhuma alteração realizada.** Não contém dados pessoais.

## Contagens exatas
| Item | Total |
|---|---:|
| Solicitações | 39 |
| Respostas | 10 |
| Histórico de status | 78 |
| Histórico de fiscalização | 0 |
| Protocolos nulos | 3 |
| Protocolos vazios | 0 |
| Protocolos duplicados (não nulos) | 0 |
| Protocolos no formato AAAA-000000 | 35 |
| Outros formatos não nulos | 1 |
| Respostas órfãs | 0 |
| Histórico de status órfão | 0 |

As três solicitações sem protocolo são anteriores a um dia. Não preencher automaticamente: investigar criação, gatilho e referências antes de uma migração específica e auditada.

## Storage
| Bucket | Público | Objetos |
|---|---|---:|
| anexos-solicitacoes | não | 54 |
| documentos-respostas | **sim** | 4 (3 PDFs) |
| comprovantes-financeiros | não | 1 |
| conteudos-mandato | sim | 0 |

A configuração pública de `documentos-respostas` exige análise de classificação e acesso. Não acessar nem divulgar os arquivos no relatório; não tornar privado sem plano de compatibilidade e autorização.

## Esquema e políticas
13 tabelas no esquema `public`, todas com RLS habilitado. Relações FK de respostas, histórico de status e fiscalização para solicitações. Políticas de leitura/edição administrativa nas tabelas principais vinculadas a identidade autenticada específica. Inserção pública de solicitação habilitada.

As RPCs `consulta_publica_protocolo(text)`, `consulta_publica_historico_protocolo(text)` e `consulta_publica_respostas_protocolo(text)` são SECURITY DEFINER, acessíveis a anon e authenticated, e aceitam apenas protocolo. A primeira pode retornar assunto, descrição, localidade, status e nome mascarado; a última pode retornar mensagem e referências de anexos. **Risco de consulta sem chave privada**, a corrigir com compatibilidade e ensaio, não por revogação imediata.

O linter Supabase apontou 15 funções SECURITY DEFINER executáveis por anon e 21 por authenticated (contagens de avisos; podem se sobrepor), além de search_path mutável em `gerar_protocolo`. Revisar por criticidade, sem concluir que houve exploração. Referências:
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

## Impedimentos para migração
1. Backup e restauração testada de PostgreSQL **e** Storage, com RTO/RPO observados.
2. Corrigir com ensaio e aprovação a consulta pública por protocolo sem chave, preservando acesso legado.
3. Investigar os 3 protocolos nulos e 1 protocolo de formato alternativo; nenhuma mudança automática.
4. Auditar o bucket público de documentos de respostas e suas URLs/regras de acesso.
5. Validar autenticação administrativa real, segregação e a função sintética 900007 no Neon.
6. Inventariar o segundo projeto Supabase: consulta apresentou timeout; não presumir que esteja vazio.
7. Obter aprovação explícita para mudanças de produção somente depois das evidências.

**Decisão:** `BLOQUEADO` para implantação; sistema atual preservado.
