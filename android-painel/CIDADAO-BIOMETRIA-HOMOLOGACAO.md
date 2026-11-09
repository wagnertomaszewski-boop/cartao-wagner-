# Biometria do cidadão — Mandato em Ação / V2

## Arquitetura e ambiente

A V2 existente é HTML/JavaScript, com estrutura de PWA. O projeto Android disponível neste repositório é um contêiner Java/WebView. Não foi localizado aqui o código Android original do pacote cidadão publicado na Play Store.

Foi acrescentada a variante **cidadaoHml** ao projeto Android existente. Reaproveita WebView, arquivos, localização autorizada e o envelope criptográfico do Painel, com interface/ciclo de vida específicos para o cidadão. Identidade: `br.com.wagnertomaszewski.painelmandato.cidadao.homologacao`; nome **Mandato em Ação Homologação**. Ela abre a V2 do Render de homologação e não substitui o pacote publicado nem altera o teste fechado.

V2 de teste: https://mandato-neon-homologacao.onrender.com/hml/v2/index.html
Acompanhamento: https://mandato-neon-homologacao.onrender.com/hml/v2/recuperar

No navegador/PWA, o acesso manual continua disponível. Os controles biométricos aparecem somente quando a ponte Android nativa cidadã está presente. Não existe reconhecimento simulado em HTML.

## Uso e segurança

1. Consultar uma solicitação fictícia com protocolo e chave válidos.
2. Escolher **Ativar biometria para este acesso** e confirmar no diálogo nativo do Android.
3. O Android consulta o servidor de forma independente antes de guardar qualquer acesso, solicita biometria forte com CryptoObject e confirma a credencial no servidor novamente.
4. Somente o envelope cifrado fica nas preferências locais. AES-256-GCM protege protocolo, chave e validade; a chave AES é encapsulada por RSA-OAEP usando chave privada não exportável no Android Keystore, com autenticação por operação e invalidação por alteração de biometria.
5. O prazo local é de até 24 horas. Expiração e recuo do relógio exigem validação manual. O prazo não renova nem substitui a validade imposta pelo servidor.
6. Cada desbloqueio biométrico consulta novamente o servidor com protocolo e chave. O segredo não retorna ao JavaScript: a tela recebe apenas os dados autorizados da solicitação. QR, leitura e arquivos continuam sujeitos à validação no servidor.
7. A chave de uma consulta biométrica permanece apenas na memória nativa por até dois minutos para essas ações, e é descartada ao navegar, bloquear ou sair. A página esconde e limpa os dados privados ao sair, inclusive para retorno pelo histórico.
8. Cancelamento/falha não libera consulta; callbacks obsoletos são descartados. Mudança de aparelho/chave do Keystore, revogação/rotação da chave de acompanhamento e expiração exigem protocolo e chave novamente.
9. Sem senha ou cookie administrativo. O APK cidadão desabilita cookies do WebView e mantém sua área local separada do Painel e da produção. Não recebe nem guarda características biométricas.
10. Há um acesso biométrico local por vez. A substituição só ocorre após validação no servidor e confirmação biométrica; cancelar mantém o acesso anterior.

O botão **Remover acesso guardado** apaga somente o envelope e sua chave local. A solicitação, o histórico e a chave válida no servidor permanecem preservados.

## Verificação automatizada e limites

Testes JVM da variante cidadã: credencial incompleta, cifragem/decifragem, cópia para outra chave/aparelho, validade/recuo do relógio, formato adulterado, origem/tela permitida e callbacks antigos após cancelamento/navegação/destruição.

Testes JavaScript: PWA sem ponte, contrato de ativação e bloqueio de operações não autorizadas. Integração PostgreSQL isolada: V2 cadastra, Painel atualiza/responde, recuperação manual rotaciona a chave, credencial antiga deixa de funcionar e auditoria não registra o código.

Esses testes não comprovam o sensor físico nem a invalidação física do Keystore após nova digital. O teste real no aparelho permanece necessário. Não há migração no banco de produção.

## Roteiro físico

Usar somente solicitação e telefone fictícios/autorizados. Não enviar chave, código ou biometria por mensagem/captura.

- Validar protocolo + chave, ativar e confirmar diálogo nativo; cancelar ativação e conferir que o acesso manual continua disponível.
- Sair/voltar, tentar digital incorreta, cancelar e tentar novamente; somente reconhecimento correto pode consultar.
- Retirar a rede: nenhum dado novo deve ser liberado sem confirmação do servidor.
- Atualizar status/resposta no Painel de homologação: desbloquear e conferir o mesmo histórico na V2.
- Recuperar a chave pelo fluxo aprovado do Painel: a credencial local antiga deve ser recusada; validar a nova manualmente e ativar novamente.
- Cadastrar/remover digital no Android: exigir reativação manual se a chave do Keystore for invalidada.
- Conferir QR sem chave, arquivo privado e confirmação de leitura. Após mais de dois minutos, desbloquear de novo para essas ações.
- Remover acesso biométrico local e conferir preservação da solicitação no servidor.

O prazo de 24 horas é verificado com relógio controlado nos testes. A confirmação física de expiração deve ser registrada separadamente; não é declarada concluída apenas por gerar o APK.
