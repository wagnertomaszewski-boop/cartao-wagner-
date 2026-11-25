# Mandato em Ação 3.0.0 para Android

Candidata TWA reconstruída a partir do AAB original, com a mesma URL inicial, o ícone e as imagens de abertura. Identificador `com.wagnertomaszewski.mandatoemacao`, SDK mínimo 23 e alvo 36, com Android Browser Helper 2.6.2 e AndroidX Browser 1.9.0-alpha04, como no AAB original.

O código 3 foi confirmado como disponível no Explorador de pacotes da Play Console em 25/11/2026. O AAB aponta para a origem oficial já usada pela versão anterior. O preenchimento do WhatsApp faz parte da atualização web preparada no mesmo commit e só ficará disponível no TWA após a publicação web autorizada.

## Assinar o AAB no Windows

1. Baixe o artefato do GitHub Actions, extraia os arquivos e abra a pasta pelo PowerShell. Tenha o JDK 17 disponível no PATH e deixe o `signing.keystore` original em uma pasta privada no computador.
2. Compare o SHA-256 do AAB com o conteúdo de `app-release.aab.sha256`.

   ```powershell
   Get-FileHash .\app-release.aab -Algorithm SHA256
   ```

3. Informe o caminho e o alias localmente. Confira se a entrada é `PrivateKeyEntry` e se o SHA-256 é `F4:CB:CF:BA:89:1F:54:53:34:B2:39:81:AC:E8:BC:BD:70:E3:F0:4C:F9:18:F6:35:8A:88:F0:F7:75:7F:F0:F0`. Digite a senha somente no prompt da ferramenta.

   ```powershell
   $mandatoKeystore = Read-Host "Caminho completo do signing.keystore"
   $mandatoAlias = Read-Host "Alias do pacote original"
   keytool -list -v -keystore "$mandatoKeystore" -alias "$mandatoAlias"
   ```

4. Assine em um arquivo separado. Confira se o `jarsigner` verifica a assinatura e se o `keytool` mostra o mesmo SHA-256.

   ```powershell
   jarsigner -keystore "$mandatoKeystore" -signedjar .\mandato-em-acao-3.0.0-assinado.aab .\app-release.aab "$mandatoAlias"
   jarsigner -verify .\mandato-em-acao-3.0.0-assinado.aab
   keytool -printcert -jarfile .\mandato-em-acao-3.0.0-assinado.aab
   ```

## Digital Asset Links

Mantenha as associações atuais de `com.wagnertomaszewski.mandatoemacao` no `/.well-known/assetlinks.json` da origem `https://wagnertomaszewski-boop.github.io`. Os APKs entregues pela Play usam os certificados de **assinatura do app** mostrados na Play Console. Preserve as impressões clássica e pós-quântica quando informadas pelo Google para este app. A impressão F4:CB:… corresponde à chave de upload confirmada e pode também estar associada ao APK instalado diretamente. Ela sozinha não comprova a associação para os APKs distribuídos pela Play. A consulta ao endereço oficial retornou 404 durante a preparação. Prepare o arquivo completo localmente com o gerador abaixo. Ele preserva as associações da cópia de origem e acrescenta as impressões de assinatura da Play fornecidas explicitamente. O arquivo final deve ser servido na raiz HTTPS do domínio, em `/.well-known/assetlinks.json`. Nunca substitua ou apague associações existentes ao preparar a atualização.

O workflow compila e entrega somente um artefato. O TWA abre a URL oficial já existente, portanto a integração com a nova API depende de publicar as telas candidatas separadamente em janela autorizada. Após essa etapa, valide cadastro, acompanhamento, anexos, recuperação, links e atualização por cima da versão antiga em Android antes de liberar a faixa de teste. Nenhuma senha ou chave privada entra no repositório.


### Gerar o arquivo localmente

Use como entrada o JSON completo da origem, ou sua última cópia íntegra se a origem estiver indisponível. Informe os SHA-256 de **assinatura do app** da Play Console, um argumento para cada certificado aplicável.

```powershell
node .\preparar-assetlinks.mjs .\assetlinks-atual.json .\assetlinks-candidato.json "SHA256_APP_CLASSICO" "SHA256_APP_POS_QUANTICO"
```
