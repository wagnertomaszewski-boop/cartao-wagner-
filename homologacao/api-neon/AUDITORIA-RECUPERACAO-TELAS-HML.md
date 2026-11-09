# Auditoria da recuperação e integração das telas

Escopo: branch `feature/recuperacao-whatsapp-manual`, serviço `mandato-neon-homologacao`, projeto Neon `proud-firefly-64745516`, branch `br-lively-snow-bev5ecau`, schema `auth_admin_hml`. Consulta de auditoria somente leitura; nenhum telefone, código, recibo ou chave incluído neste relatório. Nenhuma mudança em produção/Play Store.

## Evidência dos testes pessoais

A leitura da auditoria confirmou dois pedidos pessoais concluídos, cada um com uma aprovação, uma emissão, uma abertura solicitada do WhatsApp, uma validação correta e uma tentativa posterior de reutilização bloqueada. Os hashes de código desses pedidos foram descartados. Outro pedido confirmou expiração após uma validade de 300 segundos, também com descarte do hash. A abertura permanece registrada como intenção: não há inferência de entrega da mensagem.

As emissões anteriores mediram 299,999–300 segundos devido a duas leituras consecutivas do relógio no servidor. A emissão agora usa uma única referência de tempo para obter exatamente 300 segundos. Um pedido antigo aprovado e expirado, sem tentativa de validação, ainda tinha seu hash no banco; a validação já recusava pelo prazo. O novo painel mostra explicitamente a situação do código, sem confundir aprovação com código vigente. O hash não permite reuso após o prazo nem contém o código em texto puro.

## Integração concluída na branch

- Telas versionadas: `v2/recuperar-acesso.html` e `painel/recuperacoes.html`.
- Cliente compartilhado: `v2/seguranca/cliente-recuperacao-manual.mjs`, com origem exata de homologação, timeout, POST, sem cache e sem redirecionamentos. Operações cidadãs não carregam cookies administrativos. Chave/código/recibo não são colocados em URLs públicas nem no armazenamento do navegador.
- O V2 integra consulta com protocolo+chave, pedido de recuperação, confirmação de código, apresentação única da nova chave e consulta com essa nova chave na mesma tela.
- O Painel integra decisões justificadas, conferência do telefone, emissão, preparação do link privado do WhatsApp e auditoria individual. O link somente aparece após validação do destino/MFA no servidor. O operador ainda confirma o contato e toca em Enviar.
- Os pontos de entrada nos índices originais do V2/Painel estão preparados e restritos ao host/caminho de homologação. As opções públicas de produção continuam desativadas nesta branch até migração autorizada; não se alterou o aplicativo publicado.
- O Render serve cópias byte a byte dessas telas e módulos em `/hml/v2/recuperar` e `/hml/painel/recuperacoes`, com manifestos SHA-256 testados. Não executa scripts antigos conectados ao Supabase. As URLs antigas são redirecionadas para as telas novas.

Atualize os pacotes com `node homologacao/api-neon/preparar-telas-hml.mjs`. A suíte falha se fonte e pacote divergirem.

## Correções e testes

A ordem dos locks passou a ser solicitação → pedido de recuperação. Isso evita deadlock entre recuperações diferentes da mesma solicitação durante a invalidação das aprovações concorrentes. O autoteste v3 verifica no Neon real dois pedidos aprovados concorrentes, com exatamente um vencedor e prazo exato de 300 segundos, sem enviar WhatsApp.

A regressão adicional do Painel encontrou seis testes desatualizados. Três extraíam uma função sem carregar seu validador de datas; outros usavam respostas sem vínculo à solicitação ou esperavam ausência de aviso para ID inválido. Foram corrigidos para exercitar as funções reais e as validações atuais, inclusive bloqueio de registro de outra solicitação. Também foi corrigida uma mensagem de falha de leitura após gravação de histórico: o operador é orientado a consultar antes de repetir, evitando duplicidade. Essa correção existe somente na branch autorizada.

Verificações executadas:

- Suíte principal da API e clientes: permissões, neutralidade de respostas, protocolo sem chave, HMAC, expiração, tentativas, reemissão, uso único, concorrência, cópias das telas e URI privada do WhatsApp.
- Suíte HTTP/TOTP: cliente usado pelas telas definitivas contra servidor HTTP com autenticação real da biblioteca e PostgreSQL WASM; fluxo completo de solicitação, decisão, emissão, validação, chave antiga recusada/nova aceita, reutilização bloqueada e auditoria; MFA vencido bloqueia operações.
- Regressão das telas originais V2 e Painel, com rede simulada e sem escrita em Supabase.
- Smoke no Render: páginas/módulos com tipos MIME corretos e no-store, acesso administrativo anônimo recusado, origem externa recusada, protocolo isolado sem consulta, URLs antigas redirecionadas e prova persistida dos autotestes Neon.

Os dois testes legados da suíte principal que dependem de configuração Neon própria continuam identificados como ignorados; não são contados como aprovações. A prova Neon do novo fluxo é independente e explícita.

## Antes de liberar aos cidadãos

Ainda é necessária autorização para migrar solicitações/chaves reais, validar contatos legados e desativar as RPCs antigas de consulta apenas por protocolo na produção. A implantação no aplicativo publicado e eventual atualização Play Store são outra etapa. O fluxo novo usa exclusivamente fixtures de homologação; testes positivos na homologação não significam que a produção foi migrada ou que suas rotas antigas já foram bloqueadas.
