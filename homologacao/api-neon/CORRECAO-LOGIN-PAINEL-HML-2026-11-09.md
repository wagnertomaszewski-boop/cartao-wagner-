# Correção da entrada do Painel — homologação

09/11/2026, 21:44 de Brasília. Branch: `feature/recuperacao-whatsapp-manual`.
Código: `193587ccf4efc6b0e85f2e5658d8d7d1bb9d2515`.

## Relato e diagnóstico

O proprietário relatou que o aplicativo aparece normalmente, mas tocar em entrar/confirmar MFA não dá retorno perceptível. Não foram solicitadas nem lidas suas credenciais.

A inspeção identificou problemas concretos da interface: mensagens no rodapé distante dos campos; verificação MFA visível antes da conclusão do primeiro fator; ausência de indicação/bloqueio durante requisições; espera sem limite; autenticação aberta por um link de nova janela. Esses fatores foram corrigidos. A causa específica da tentativa no aparelho ainda não foi comprovada com uma nova entrada física.

## Alterações

- Feedback visível junto aos campos, com indicação de verificação, erros de senha/código, limite de tentativas, falha de conexão e timeout de 15 segundos.
- E-mail/senha primeiro; código atual do autenticador somente na etapa apropriada.
- Botões temporariamente desabilitados durante requisição, evitando cliques concorrentes.
- Nova opção para reiniciar a entrada, sem reutilizar a etapa MFA anterior.
- Painel abre automaticamente somente depois de confirmar sessão autenticada e MFA recente no servidor.
- Link de renovação utiliza a mesma janela do aplicativo.
- Campos de ensaio de WhatsApp/chave ocultos na página de entrada, que passa a identificar claramente o Painel do Mandato.
- Formulários usam POST mesmo na falha do JavaScript, evitando senha/código em endereço GET.
- Cookies HttpOnly, origem, limites, permissões, TOTP e MFA recente do servidor permanecem exigidos.

Arquivos: hml-admin.html/.js/.css; hml-login-fluxo.mjs e seu teste; rota estática em servidor-auth-hml.mjs; painel/recuperacoes.html e cópia/manifesto empacotados.

## Testes e implantação

- Dez novos testes do fluxo: aprovados, zero falhas.
- Integração HTTP com PostgreSQL isolado: login, TOTP, sessão, aprovação, CSRF, rotas restritas e logout aprovados com dados fictícios.
- CI completa: API/modelos/segurança 473 aprovados, zero falhas, dois ignorados; autenticação/HTTP seis aprovados; telas 38 aprovados. Não somar como casos únicos: há sobreposição entre suítes e os novos testes estão incluídos na suíte principal.
- Os dois ignorados são integrações externas legadas com fixtures/configuração própria.
- Workflow verificado: https://github.com/wagnertomaszewski-boop/cartao-wagner-/actions/runs/42730517485 — success.
- Render `mandato-neon-homologacao`: deploy `dep-dbp6hhqvcj2c73cq4520`, live, concluído em 09/11 às 21:44:29 de Brasília.
- Conferência da tela real: título correto, conta de homologação indicada, botão de entrada habilitado, MFA oculto antes da etapa correta e campos antigos ocultos.

Nenhuma credencial real foi usada em testes automatizados. Nenhuma alteração no banco de produção, aplicativos publicados ou Play Store.

## Validação restante

A entrada real no aparelho do proprietário ainda precisa ser confirmada. Não foi declarado sucesso de login ou reconhecimento biométrico físico com base apenas nos testes.

A correção é da tela carregada pelo APK existente: fechar completamente e reabrir com internet. Em seguida, informar e-mail/senha, aguardar a confirmação dessa etapa e só então informar o código atual do autenticador.

Se houver falha, a mensagem fica junto aos campos. Solicitar somente esse texto, nunca senha/código. Não é necessário reinstalar o APK para receber esta correção.
