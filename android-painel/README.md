# Painel do Mandato — aplicativo Android

Aplicativo Android separado do aplicativo público Wagner.
Identificador: `br.com.wagnertomaszewski.painelmandato`.
Mostra a versão hospedada `https://wagnertomaszewski-boop.github.io/cartao-wagner-/painel/index.html` dentro de um WebView com armazenamento local persistente, anexo de arquivos e abertura externa de links fora do site.

## Gerar APK para teste
Abra Actions > "Painel V17 - Gerar APK Android" no GitHub.
O workflow gera o APK de teste na seção Artifacts.

O APK de teste utiliza assinatura de desenvolvimento do runner. Para distribuir atualizações futuras do APK é necessária uma chave de assinatura persistente, guardada em segredo; não a armazene em um repositório público. Atualizações das páginas do painel são carregadas diretamente da internet.

Requer Android 7+ e conexão com a internet. Não publica na Google Play e não ativa notificações nativas.
