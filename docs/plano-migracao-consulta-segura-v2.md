# Migração da consulta pública para protocolo + chave — plano de execução

**Status: planejamento, NÃO aplicado em produção.** A V2 publicada continua consultando protocolo sem chave. Não considerar os dados protegidos até desativar os RPCs antigos.

## Inventário confirmado
- Supabase produção: projeto `pmmsdjozyyxkbuqlkfpb`, tabela `public.solicitacoes` (39 registros no último levantamento; 3 sem protocolo). Recontar antes da migração.
- O código `v2/index.html` usa `consulta_publica_protocolo` para consultar por protocolo, sem autenticação adicional.
- Outras funções legadas que exigem revisão: `consultar_protocolo`, `consulta_publica_respostas_protocolo`, `consulta_publica_historico_protocolo`.
- O banco Neon `mandato_testes` é exclusivamente de testes; **não** é um endpoint REST Supabase e não substitui automaticamente o banco de produção.

## Critérios obrigatórios antes de ativar a flag da V2
1. Fazer inventário atualizado de protocolos duplicados, vazios e ausentes; registrar plano de correção sem atribuir chaves ao cidadão errado.
2. Definir como entregar a chave inicial aos cidadãos com solicitações existentes, com validação de identidade pelo administrador. Não enviar chave por mensagem automática sem verificação.
3. Implementar no **banco de produção** RPCs protegidos por segredo aleatório de alta entropia, armazenando apenas hash da chave, com limitação de tentativas e auditoria. Preparar migração reversível, testada em cópia sem dados pessoais reais.
4. Proteger consulta de detalhes, histórico, respostas e anexos no **servidor**. Nunca enviar caminhos privados de armazenamento ao navegador; emitir URLs temporárias somente após autenticação e autorização.
5. Criar e testar API HTTPS de produção com credenciais apenas no servidor; aplicar controle de origem, limite distribuído de tentativas, validação de entrada e políticas de cache.
6. Verificar autorização do administrador no servidor e confirmar identidade antes de aprovar recuperação. Checkbox ou informação enviada pelo navegador não constitui prova.
7. Testar com protocolo correto/chave correta, chave errada, protocolo inexistente, solicitações antigas, solicitações novas, respostas, anexos, perda da chave e recuperação.
8. **Coordenar a publicação**: primeiro garantir nova consulta disponível e entrega das chaves; então remover `EXECUTE` dos RPCs antigos para papéis públicos, revisar grants de funções equivalentes e confirmar que nenhuma URL pública contorna a nova chave. Evitar janela com API antiga ainda expondo dados.
9. Habilitar `SEGURANCA_V2_ATIVA` apenas após testes end-to-end; monitorar falhas e manter plano de reversão **sem reabrir** os RPCs vulneráveis.

## Pontos de atenção
- A flag desligada **não corrige** a vulnerabilidade atual. Ela apenas evita ativar uma integração incompleta.
- A recuperação pelo WhatsApp é **manual**, não é prova de titularidade por si só.
- Não aplicar alterações em produção sem backup, revisão de privilégios e teste de regressão.
- Não contratar serviço pago nem publicar atualização sem decisão explícita do operador.
