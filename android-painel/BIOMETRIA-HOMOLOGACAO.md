# Biometria nativa — somente homologação

Implementação na variante debug do Painel existente, que usa WebView. Release contém somente implementação vazia; nenhuma permissão biométrica, interface ou armazenamento de sessão desta funcionalidade foi acrescentado à variante publicada.

## Uso

1. Instalar o APK identificado como Painel do Mandato Homologação.
2. Entrar com conta exclusiva de homologação e concluir o MFA.
3. Tocar no botão **Biometria** da barra nativa e escolher **Ativar após MFA**.
4. O aplicativo consulta a sessão diretamente no servidor autorizado por HTTPS, sem redirecionamentos. Apenas sessão administrativa autenticada, MFA ativado e MFA recente permitem ativar.
5. Confirmar no diálogo nativo do Android. Biometria forte é exigida; no Android 9, esta versão usa impressão digital. Android 7/8 mantêm login tradicional.
6. Ao sair do aplicativo, o conteúdo fica oculto e o WebView é limpo. Para retornar, usar biometria ou login tradicional.
7. A biometria não cria sessão, não renova o MFA nem altera permissões no servidor. Sessão expirada/revogada ou MFA sem validade recente exige login completo.
8. Após retomada biométrica, operações que modificam dados são recusadas localmente até novo login com senha e MFA. O servidor mantém sua própria validação administrativa e MFA recente.
9. Para desativar, usar o botão Biometria. A sessão protegida local é removida; novo login é exigido.

## Proteções

- Android `BiometricPrompt` com `CryptoObject`, sem simulação HTML, JavaScript ou leitura de características biométricas.
- Chave privada RSA não exportável no Android Keystore, autenticação por operação e invalidação por novo cadastro biométrico.
- Sessão cifrada com AES-256-GCM; chave AES encapsulada com RSA-OAEP SHA-256/MGF1-SHA1. Modificação do envelope ou outra chave impede a abertura.
- Somente o cookie seguro de sessão do domínio de homologação pode entrar no envelope. Senha, códigos MFA e cookies transitórios de segundo fator não são armazenados pela funcionalidade.
- Enquanto o WebView está ativo, o token precisa existir em sua memória para as requisições. O checkpoint próprio persistido é cifrado; cookies e página são removidos ao bloquear ou sair. Não se afirma que o Keystore substitui o armazenamento interno do WebView durante uso ativo.
- Sem backup do app; sem exportação da chave; tela protegida contra capturas e prévias de tarefas na homologação. Sem logs de tokens ou payloads.
- Falha, cancelamento ou perda de rede não libera a sessão. Mudança/invalidação da chave exige login completo e nova ativação.

## Testes e limites

Os testes JVM cobrem criptografia/integridade, chave incorreta, arquivo truncado, limites, origem, seleção do cookie e política de bloqueio, cancelamento, sessão expirada/revogada e MFA. A simulação da invalidação verifica a política; ela não comprova comportamento de sensor ou Keystore físico.

A compilação verifica debug e release e os manifestos. Não há teste físico executado automaticamente por esta implementação.

## Roteiro obrigatório no aparelho

Usar somente solicitações fictícias. Não enviar senha, código MFA ou token por conversa, vídeo ou captura.

- Sem biometria cadastrada: login tradicional continua disponível.
- Após senha sem MFA: ativação recusada.
- Após senha + MFA: ativação solicita diálogo nativo e conclui somente com biometria correta.
- Cancelar ativação: não ativa biometria. Falhar reconhecimento: não libera a sessão.
- Sair e voltar: conteúdo oculto; cancelar desbloqueio mantém bloqueado.
- Reconhecimento correto e sessão recente: retoma a sessão, sem renovar validade.
- Tentar aprovar/emitir/alterar após retomada: deve exigir login completo; cancelamento não executa operação.
- Falta de rede: permanece bloqueado. Revogar sessão no servidor ou aguardar expiração: exige login completo.
- Aguardar mais de cinco minutos desde o MFA: exige login completo conforme a política atual de homologação.
- Cadastrar outra impressão digital ou remover a biometria: envelope antigo não pode liberar o painel; entrar e ativar novamente.
- Desativar biometria: remove checkpoint; senha e MFA continuam funcionando.
- Conferir que a versão publicada permanece separada. Se a assinatura debug anterior impedir instalação, remover somente o aplicativo de homologação anterior; isso apaga a sessão local e exige novo login. Dados no servidor são preservados.
