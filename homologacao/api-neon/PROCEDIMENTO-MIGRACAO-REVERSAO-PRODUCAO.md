# Procedimento de migração e reversão — V2 / Painel do Mandato
**Estado:** PREPARADO, NÃO AUTORIZADO PARA EXECUÇÃO  
**Branch de trabalho:** `feature/recuperacao-whatsapp-manual`  
**Homologação:** Neon `proud-firefly-64745516` / `neondb`  
**Produção:** banco Supabase existente — **não executar este documento automaticamente**.

## 1. Limites e responsabilidades
- A homologação aprovada no GitHub não constitui autorização para produção.
- A implementação atual `iniciar-homologacao.mjs` aceita exclusivamente `MANDATO_AMBIENTE=homologacao` e host Neon restrito; **não é um servidor de produção**. Não contornar essa proteção alterando flags, hostname ou URL.
- Nenhum script deste procedimento concede permissões, copia dados pessoais, ativa rotas, publica aplicativos ou modifica produção.
- Responsável técnico deve identificar o esquema real, dependências, volume, rotinas de backup, políticas RLS, Storage e serviços externos **antes** de elaborar SQL de migração. Não presumir nomes de tabelas ou que anexos estejam no PostgreSQL.
- Aprovação explícita e específica para a janela de implantação e para as operações propostas deve ser obtida após revisão das evidências.

## 2. Inventário e linha de base (somente leitura)
1. Registrar versão/commit implantados do app cidadão, V2 público, Painel e API, domínios, responsáveis, flags e configurações (sem copiar segredos).
2. Identificar bancos e schemas efetivamente usados, tabelas de solicitações, protocolos, histórico, respostas, anexos, chaves e recuperação; conferir FKs, índices, triggers, políticas RLS e permissões. Levantar onde ficam os arquivos e respectivas regras de acesso.
3. Registrar contagens por entidade, intervalo de datas, duplicações de protocolos, referências órfãs e integridade das ligações. Guardar apenas resultados agregados e identificadores sintéticos no relatório.
4. Documentar rotas atuais de consulta, abertura de solicitação, acompanhamento e administração; preservar funcionamento anterior até o aceite.
5. Verificar versão de schema, migrações existentes, janela de retenção e restauração do backup com a equipe responsável.

## 3. Backup e ensaio de restauração (bloqueante)
1. Realizar backup consistente de produção pelos mecanismos oficiais do provedor, incluindo banco e arquivos/anexos (separadamente, quando necessário). Validar data, escopo, retenção e permissões.
2. Restaurar cópia **em ambiente isolado e com acesso restrito** conforme política de privacidade. Não levar dados reais para Neon de testes sem base legal, minimização e aprovação.
3. Executar verificações de integridade e acesso aos anexos na restauração; registrar RTO/RPO alcançáveis, não estimados.
4. Não prosseguir se não for possível demonstrar restauração completa.

## 4. Segurança e prontidão (bloqueantes)
- Confirmar `npm test` e workflow HTTP–Neon no commit candidato, logs completos, warnings e segredos de homologação, sem expor valores.
- Validar autenticação administrativa com provedor real e segunda confirmação independente, incluindo negativas para sessão expirada, UID não autorizado e decisão sem conferente.
- Revisar privilégios das funções do Neon, especialmente `registrar_decisao_sintetica_900007` (SECURITY DEFINER e EXECUTE da API): documentar necessidade, revogação/segregação e teste de regressão. **Não revogar automaticamente**, pois testes de homologação podem depender dela.
- Confirmar inexistência de EXECUTE público indevido, regras de acesso por cidadão, proteção contra enumeração, CORS, rate limit e logs sem tokens/chaves.
- Definir arquitetura própria de produção, papéis mínimos e isolamento de segredos. Não reutilizar credenciais ou banco de homologação.
- Completar `verificar-pre-producao.mjs` com evidências verificáveis, incluindo `aprovacao_explicita_implantacao` apenas depois da autorização.

## 5. Plano de implantação progressiva (a executar SOMENTE após aprovação)
**Fase A — preparar sem tráfego:** aplicar migrações de schema aditivas e reversíveis, após revisão do SQL específico; manter sistema antigo como fonte oficial. Não excluir colunas, tabelas, chaves ou políticas antigas. Registrar versão antes/depois e transação quando aplicável.

**Fase B — sincronizar e reconciliar:** se houver transferência de dados, usar ferramenta de migração idempotente e auditada, em lotes, com checkpoints, reexecução segura e proteção de PII. Comparar contagens e integridade; não declarar sucesso apenas por contagem igual. Confirmar hashes/identificadores de anexos sem publicá-los.

**Fase C — validação sem exposição:** testar com protocolos sintéticos e, para legados, amostra autorizada com acesso protegido; conferir consulta com chave correta/incorreta, respostas, histórico, anexos, criação e status; garantir que URLs de arquivos não sejam públicas. Verificar painel e app cidadão.

**Fase D — ativação controlada:** após aceite formal, habilitar tráfego em pequena parcela ou por conta piloto com monitoramento de erros e latência. Não permitir dupla escrita sem mecanismo explícito de reconciliação. Aumentar gradualmente apenas se critérios forem cumpridos. Registrar horário e responsáveis.

**Fase E — aceite:** verificar fluxos ponta a ponta, integridade de dados e anexos, recuperação e auditoria. Manter infraestrutura antiga disponível durante período de observação aprovado. Desativação da infraestrutura antiga requer decisão posterior e separada.

## 6. Critérios de interrupção imediata
- Qualquer acesso a protocolo/anexo de outro cidadão, falha de autorização ou vazamento de credencial.
- Perda, duplicação não controlada ou inconsistência de solicitação, histórico, resposta, anexo ou chave.
- Aumento de falhas HTTP/SQL, indisponibilidade relevante ou recuperação não auditável.
- Falha de backup, restauração, reconciliação, monitoramento ou impossibilidade de identificar a versão ativa.

## 7. Reversão segura (rollback)
1. **Congelar a expansão** e desabilitar o roteamento para o novo serviço; manter a infraestrutura antiga disponível. Preservar evidências e logs com controle de acesso.
2. Se a mudança for apenas de roteamento/feature flag e o sistema antigo permanecer íntegro, restaurar a rota anterior e confirmar consultas/abertura de solicitações.
3. Se houve gravações no sistema novo, **não restaurar backup antigo por cima da produção**: isso apagaria registros posteriores. Primeiro bloquear novas escritas no destino afetado, inventariar diferenças desde o checkpoint e definir reconciliação supervisionada.
4. Reverter migrações de schema somente com SQL de rollback previamente revisado, após verificar dependências e integridade; preferir deixar colunas aditivas inativas em vez de fazer DROP sob pressão.
5. Se houver corrupção comprovada, usar restauração pontual/isolada do backup e plano de recuperação de dados posterior ao snapshot; exigir aprovação do responsável e comunicação aos afetados conforme necessidade.
6. Validar novamente abertura e consulta de solicitações, protocolos legados, anexos, painel, permissões e auditoria. Documentar causa, intervalo de impacto e próximos passos.
7. Não eliminar logs nem credenciais antes da análise de incidente; rotacionar segredos quando houver suspeita de exposição.

## 8. Evidências e aceite
Registrar em relatório de implantação, sem dados pessoais:
- commit, artefatos e resultados CI; backup/restauração e RPO/RTO observados;
- inventário de schemas e Storage, contagens agregadas, reconciliação e integridade;
- provas de autenticação, isolamento de acesso e teste de anexos;
- procedimento de reversão ensaiado, métricas de monitoramento e responsáveis;
- autorização explícita de implantação, janela aprovada, hora de início/fim, resultados e decisão final.

**Status atual:** este runbook está preparado; execução em produção, backup real, migração e reversão **não foram realizados**. O projeto só pode ser liberado depois que os oito requisitos de `prontidao-migracao.mjs` forem confirmados com evidências verdadeiras.
