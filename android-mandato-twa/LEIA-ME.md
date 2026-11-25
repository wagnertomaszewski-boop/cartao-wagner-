# Mandato em Ação 3.0.0 para Android

Candidata TWA reconstruída a partir do AAB original, com a mesma URL inicial, o ícone e as imagens de abertura. Identificador `com.wagnertomaszewski.mandatoemacao`, SDK mínimo 23 e alvo 36, com Android Browser Helper 2.6.2 e AndroidX Browser 1.9.0-alpha04, como no AAB original.

A Play Console informa que a versão ativa é 2.0.0, código 2. Antes de usar o código 3 para assinar e preparar o envio, confira no **Explorador de pacotes de apps** se ele nunca foi usado, inclusive em rascunhos e em qualquer faixa de teste. A compilação sem assinatura é apenas uma candidata. Se 3 já estiver ocupado, gere outro candidato com um número acima do maior código usado.

## Assinar o AAB no computador

1. Baixe o artefato do GitHub Actions e extraia o AAB sem assinatura. Use o JDK 17. Abra o terminal na pasta do AAB.
2. Confira o certificado do alias do `signing.keystore` existente. Substitua `SEU_ALIAS` pelo alias guardado com o pacote original. Digite a senha somente no prompt local.

   ```text
   keytool -list -v -keystore signing.keystore -alias SEU_ALIAS
   ```

   Prossiga somente se **SHA256** for `F4:CB:CF:BA:89:1F:54:53:34:B2:39:81:AC:E8:BC:BD:70:E3:F0:4C:F9:18:F6:35:8A:88:F0:F7:75:7F:F0:F0` e o tipo da entrada for `PrivateKeyEntry`.

3. Assine mantendo uma cópia separada e confira a assinatura e a impressão digital do AAB resultante.

   ```text
   jarsigner -keystore signing.keystore -signedjar mandato-em-acao-3.0.0-assinado.aab app-release.aab SEU_ALIAS
   jarsigner -verify mandato-em-acao-3.0.0-assinado.aab
   keytool -printcert -jarfile mandato-em-acao-3.0.0-assinado.aab
   ```

## Digital Asset Links

Mantenha as associações atuais de `com.wagnertomaszewski.mandatoemacao` no `/.well-known/assetlinks.json` da origem `https://wagnertomaszewski-boop.github.io`. Os APKs entregues pela Play usam os certificados de **assinatura do app** mostrados na Play Console. Preserve as impressões clássica e pós-quântica quando informadas pelo Google para este app. A impressão F4:CB:… corresponde à chave de upload confirmada e pode também estar associada ao APK instalado diretamente. Ela sozinha não comprova a associação para os APKs distribuídos pela Play. A consulta ao endereço oficial retornou 404 durante a preparação. Antes de liberar, publique ou restaure nesse ponto o arquivo completo com as associações aprovadas. Nunca substitua ou apague associações existentes ao preparar a atualização.

O workflow compila e entrega somente um artefato. O TWA abre a URL oficial já existente, portanto a integração com a nova API depende de publicar as telas candidatas separadamente em janela autorizada. Após essa etapa, valide cadastro, acompanhamento, anexos, recuperação, links e atualização por cima da versão antiga em Android antes de liberar a faixa de teste. Nenhuma senha ou chave privada entra no repositório.
