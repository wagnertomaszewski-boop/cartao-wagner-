# Plano de migração V2 — somente homologação (07/11/2026)

Escopo: branch `feature/recuperacao-whatsapp-manual`; Neon de testes `proud-firefly-64745516`. Este documento não autoriza migração nem habilitação.

## Portões obrigatórios
1. Executar `cd homologacao/api-neon && npm ci && npm test` em ambiente isolado, sem credenciais de produção. Registrar saída e commit exato.
2. Executar smoke HTTP-Neon com segredos de homologação no GitHub Actions, com conta `mandato_api_homologacao`, nunca com proprietário do banco. Confirmar projeto Neon correto e ausência de efeitos em dados reais.
3. Validar isolamento entre pelo menos duas solicitações fictícias com chaves diferentes: chave A não pode consultar B, inclusive histórico e anexos. Excluir dados fictícios apenas por procedimento auditado e autorizado.
4. Validar autenticação administrativa com token válido, inválido, expirado e erro de verificação. Confirmar que aprovação de recuperação exige verificação independente de identidade no servidor.
5. Revisar CORS, limites de corpo, rate limiting por instância, logs sem dados sensíveis e permissões SQL das funções `SECURITY DEFINER`. O limitador em memória não substitui proteção distribuída em produção.
6. Fazer revisão humana dos resultados, plano de rollback e estimativa de custo. Obter autorização explícita antes de qualquer ativação.

## Estratégia
- Manter `HABILITAR_ROTAS_CIDADAO_TESTES=nao` no serviço remoto até validação e autorização; não mudar Supabase de produção.
- Não copiar dados reais para Neon de testes. Usar somente protocolos, números e anexos fictícios.
- Preparar migração gradual apenas em documento; não trocar endpoints no V2, não alterar `main` e não ativar nova segurança.
- Rollback proposto: manter endpoints atuais intactos, desligar novas rotas e retornar à versão previamente aprovada; validar em homologação antes de usar.
- Critério de bloqueio: qualquer falha de isolamento, autenticação, permissão ou teste HTTP-Neon impede avanço.

## Evidência desta rodada
Adicionado `homologacao/api-neon/autenticacao-negativa.test.mjs` com três testes locais de falha fechada. Commit: `cb546984e5a853f9d709cc706ab4f871826fd108`. **Arquivo registrado, execução ainda não comprovada nesta rodada.** Nenhuma credencial foi utilizada.
