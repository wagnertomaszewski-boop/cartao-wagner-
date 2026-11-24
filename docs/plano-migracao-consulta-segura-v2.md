# Atualização operacional — 24/11/2026 (após contenção)

**Situação atual: produção protegida, acompanhamento público em manutenção.**
Os parágrafos históricos de planejamento abaixo descrevem a situação **anterior à contenção emergencial** e não devem ser tratados como estado atual.

Inventário somente leitura executado no projeto `pmmsdjozyyxkbuqlkfpb`, sem ler dados pessoais:
- **44 solicitações**, 41 com protocolo e **3 sem protocolo**.
- **Nenhum protocolo duplicado**.
- **0 chaves individuais ativas**.
- **0 das quatro RPCs legadas executáveis** por `anon` ou `authenticated`.
- Bucket `documentos-respostas` **privado** (o de conteúdo institucional permanece público).
- Papel de banco `mandato_api_privada` **ainda não existe** no Supabase real.
- Contatos: um telefone com DDD e oito dígitos e três em formato não padronizado; **não inventar, completar ou trocar números automaticamente**.

## Caminho obrigatório para reativação, sem reabrir o protocolo isolado

1. **Corrigir os 3 registros sem protocolo com auditoria administrativa e identificação certa.** Nenhuma chave é gerada automaticamente ou atrelada a outro solicitante.
2. **Criar o backend de privilégios mínimos e a API privada**, somente em migração autorizada e depois de conferir backup restaurável. Não criar RPC pública `SECURITY DEFINER` como atalho.
3. **Homologar ponta a ponta a consulta por protocolo + chave**, histórico, respostas, anexos e limites contra tentativas. Recusas devem ser neutras.
4. **Primeiro acesso de solicitações antigas:** cidadão informa o protocolo e WhatsApp cadastrado; o operador confere identidade, aprova com MFA, envia manualmente código temporário ao destino autorizado; cidadão valida e recebe sua chave individual. Não liberar chave pelo protocolo sozinho.
5. **Contato antigo ou alterado:** não inferir o nono dígito. Regularizar com comprovação independente do novo telefone antes de enviar código.
6. **Confirmar que o Painel mantém login, MFA, biometria, leitura dos documentos e funções de gestão**, inclusive no Android, e revisar backup e reversão sem reabrir a exposição.
7. **Implantação pública somente após autorização específica**, com monitoramento. O gate `producao/preflight-consulta.mjs` falha fechado se qualquer pré-requisito faltar.

A implementação de primeiro acesso da homologação usa **dados sintéticos**, não pedidos reais. A Twilio não é necessária para o envio manual pelo WhatsApp. **Não aplicar nenhuma migração produtiva adicional automaticamente.**

---

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
