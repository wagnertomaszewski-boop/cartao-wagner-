# Painel do Mandato — aplicativo Android

Aplicativo administrativo separado do aplicativo público Vereador Wagner.

- Identificador Android: `br.com.wagnertomaszewski.painelmandato`
- Página inicial: `https://wagnertomaszewski-boop.github.io/cartao-wagner-/painel/index.html`
- Android 7 ou superior, com internet.
- A compilação não altera os compromissos no banco de dados.

## Distribuição recomendada: teste interno da Google Play

O workflow **Painel do Mandato - Play Store (teste interno)** gera um Android App Bundle (`.aab`) de produção, assinado com **a mesma chave permanente** em todas as versões. O proprietário envia o bundle para a faixa de teste interno da Play Console.

O workflow antigo **Painel V17 - APK DEBUG (nao distribuir)** produz apenas um APK de diagnóstico. Ele executa `assembleDebug`, usa uma chave temporária do GitHub Actions e **não deve ser distribuído aos usuários**: outra compilação pode ter assinatura diferente e não atualizar a instalada.

### 1. Preparar a chave de upload permanente

O proprietário deve criar a chave em seu computador, guardar uma cópia protegida e definir senhas privadas. **Não envie a chave, o Base64 nem as senhas por chat ou e-mail; não publique no repositório.**

Em um computador com JDK instalado, um exemplo de geração é:

```sh
keytool -genkeypair -v -keystore painel-upload.jks -storetype PKCS12 -alias painel-upload -keyalg RSA -keysize 3072 -validity 10000
```

O comando solicita a senha e os dados do certificado. Guarde `painel-upload.jks`, o alias `painel-upload` e as senhas. Essa é a chave de **upload**; a Google pode administrar separadamente a assinatura final pelo **Play App Signing**.

No GitHub, abra **Settings > Secrets and variables > Actions > New repository secret** e cadastre:

| Segredo | Valor |
| --- | --- |
| `PAINEL_KEYSTORE_BASE64` | Arquivo `.jks` convertido integralmente em Base64, sem quebras de linha |
| `PAINEL_KEYSTORE_PASSWORD` | Senha do arquivo `.jks` |
| `PAINEL_KEY_ALIAS` | `painel-upload` ou o alias escolhido |
| `PAINEL_KEY_PASSWORD` | Senha da chave/alias |

Para gerar o Base64 localmente, em PowerShell no Windows:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\CAMINHO\painel-upload.jks'))
```

Em Linux, por exemplo: `base64 -w 0 painel-upload.jks`. O Base64 **não é criptografia**: proteja esse valor como uma chave privada.

### 2. Gerar o pacote no GitHub

1. Abra **Actions** no repositório.
2. Selecione **Painel do Mandato - Play Store (teste interno)**.
3. Clique em **Run workflow** e aguarde.
4. Baixe o artefato `Painel-do-Mandato-PlayStore-AAB` e extraia `app-release.aab` do ZIP.

Se algum segredo estiver faltando, a geração será interrompida. Nenhum segredo é publicado como artefato.

### 3. Configurar o teste interno

1. Na **Google Play Console** do proprietário, crie um app **separado** para o Painel do Mandato. Não substitua o aplicativo público Vereador Wagner.
2. Configure o **Play App Signing** conforme as instruções da Play Console.
3. Na faixa **Teste interno** do novo aplicativo, crie uma versão e envie `app-release.aab`.
4. Inclua somente os e-mails autorizados a testar o painel administrativo e use o link de adesão fornecido pela Play Console.
5. Atenda às solicitações de dados, segurança e acesso que a Play Console apresentar.

**Quem já tem o app 1.0.0:** ele pode estar assinado com uma chave de depuração diferente. Nesse caso, Android não aceitará a atualização direta. **Não desinstale o aplicativo antigo sem antes confirmar que os compromissos estão salvos no serviço remoto e que não há dados locais pendentes.** Desinstalar apaga dados locais, como a sessão de login. Isso não apaga automaticamente compromissos remotos já salvos, mas eles precisam ser conferidos primeiro.

### 4. Verificar os lembretes no celular

1. Abra o app distribuído pelo teste interno, entre no Painel e acesse **Minha agenda**.
2. Toque em **Ativar avisos**, permita notificações no Android e use **Enviar aviso de teste**.
3. Verifique o modo de economia de bateria, que pode adiar os avisos aproximados.

Os lembretes são programados localmente, cerca de 24 horas e 1 hora antes. A agenda autenticada sincroniza os compromissos ao ser aberta; alterações feitas em outro aparelho exigem abrir a agenda novamente. Notas e endereços particulares não são enviados aos avisos. O app tenta reagendar alarmes após reiniciar o aparelho.

## Futuras versões

- Aumente `versionCode` em `android-painel/app/build.gradle` antes de cada novo lançamento.
- Reutilize **a mesma chave e os mesmos segredos de upload**. Guarde uma cópia de segurança fora do GitHub.
- Nunca publique `.jks`, senhas ou Base64 da chave no repositório.
- Teste autenticação, agenda e notificações num dispositivo real antes de distribuir.
