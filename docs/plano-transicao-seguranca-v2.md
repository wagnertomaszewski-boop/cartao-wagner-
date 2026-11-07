# Plano de transição segura V2 — rascunho de homologação

**Estado:** planejamento, NÃO autoriza migração ou publicação. Escopo exclusivo: branch `feature/recuperacao-whatsapp-manual` e Neon de testes. Não executar SQL de migração no Supabase de produção.

## Critérios de entrada
1. Executar a suíte original em checkout verificável do commit, registrar comando, versão Node e saída integral.
2. Executar teste HTTP real contra API de homologação ligada exclusivamente ao Neon de testes, com host explicitamente permitido e segredos apenas no servidor. Verificar falhas de conexão e recuperação.
3. Confirmar identidade e autorização de administradores no servidor; manter rota de decisão desabilitada até verificador de identidade independente estar aprovado.
4. Revisar proteção de chave/protocolo, retenção de dados, anexos privados e rate limit distribuído (não confiar em X-Forwarded-For enviado pelo navegador).
5. Inventariar tabelas, relações, contagem de solicitações, anexos, status, respostas e histórico da produção usando somente consultas autorizadas e sem exportar PII para logs.

## Estratégia proposta (depende de aprovação específica)
1. Preparar ambiente de staging isolado com dados sintéticos e testar migração completa e reversão.
2. Fazer backup verificável da origem por mecanismo aprovado e validar restauração em staging; nenhuma cópia de dados reais para Neon de testes.
3. Planejar migração idempotente com correspondência de IDs, controle de duplicatas, contagem e checksums sem dados pessoais; documentar tratamento de anexos.
4. Adotar primeiro leitura segura em paralelo, com feature flag desligada por padrão e sem alterações no fluxo atual; comparar resultados somente em ambiente autorizado.
5. Definir janela, responsáveis, critérios objetivos de aprovação e rollback; somente depois de autorização explícita ativar para um grupo restrito.
6. Monitorar taxas de erro, tempo de resposta, solicitações recebidas e integridade; reverter a flag imediatamente em falhas.

## Condições que impedem lançamento
- Falta de validação HTTP-Neon real, suíte original não executada ou identidade administrativa sem confirmação.
- Falha de autorização por função, exposição de anexos, dados reais em logs, ausência de backup testado ou de plano de rollback.
- Limitação por IP que prejudique moradores em redes compartilhadas, sem mitigação documentada.

## Evidência de 2026-11-07
- Adicionado `homologacao/api-neon/integracao-http-postgres.test.mjs` com testes de caminho HTTP→executor PostgreSQL **simulado** e rejeição de métodos administrativos inválidos. **Ainda não executados nesta rodada**: ambiente local sem resolução DNS para GitHub, sem checkout verificável. Não confundir o teste com integração ao Neon real.

## Bloqueador específico: RPCs legadas por protocolo previsível
As funções públicas de produção `consulta_publica_protocolo`, `consultar_protocolo`, `consulta_publica_respostas_protocolo` e `consulta_publica_historico_protocolo` foram identificadas como risco de consulta por protocolo sequencial sem chave secreta. **Não desabilitar isoladamente**: o frontend V2 publicado ainda chama `consulta_publica_protocolo`, e a remoção imediata pode impedir moradores de acompanhar solicitações.

Critérios obrigatórios para o corte coordenado:
1. Garantir geração e entrega segura de chave para solicitações novas; a função de criação de teste ainda aceita `cidadao_id` enviado pelo cliente e **não pode ser ativada em produção**.
2. Definir recuperação segura de acesso para solicitações antigas sem chave, com validação de identidade fora do navegador, canal de entrega seguro e procedimento auditável.
3. Implementar e validar API HTTPS de consulta por protocolo + chave e acesso a anexos por autorização no servidor, sem expor `caminho_privado`.
4. Validar compatibilidade com versões antigas instaladas, incluindo a V1 da Play Store; prever mensagem de atualização ou rota de transição antes de revogar RPCs.
5. Preparar backup restaurável, plano de reversão e testes de equivalência com dados sintéticos; medir sucesso de consultas e solicitações durante transição.
6. Só após critérios e aprovação específica: publicar cliente compatível, ativar fluxo seguro gradualmente e revogar execução das quatro RPCs antigas na mesma janela controlada. Verificar por chamadas reais que acesso sem chave deixou de funcionar.

**Regra de segurança:** não confundir testes positivos no Neon com correção da exposição no Supabase de produção. A vulnerabilidade legada permanece até a transição coordenada.
