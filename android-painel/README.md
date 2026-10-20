# Painel do Mandato — aplicativo Android

Aplicativo Android separado do aplicativo público Wagner.
Identificador: `br.com.wagnertomaszewski.painelmandato`.
Mostra a versão hospedada `https://wagnertomaszewski-boop.github.io/cartao-wagner-/painel/index.html` dentro de um WebView com armazenamento local persistente, anexo de arquivos e abertura externa de links fora do site.

## Gerar APK para teste
Abra Actions > "Painel V17 - Gerar APK Android" no GitHub.
O workflow gera o APK de teste na seção Artifacts.

O APK de teste utiliza assinatura de desenvolvimento do runner. Para distribuir atualizações futuras do APK é necessária uma chave de assinatura persistente, guardada em segredo; não a armazene em um repositório público. Atualizações das páginas do painel são carregadas diretamente da internet.

Requer Android 7+ e conexão com a internet. Não publica na Google Play. A partir da versão 1.1, permite ativar lembretes nativos da agenda, aproximadamente 24 horas e 1 hora antes do compromisso.

## Avisos da agenda
1. Instale o novo APK e entre na agenda pelo Painel do Mandato.
2. Toque em **Ativar avisos**, permita as notificações no Android e use **Enviar aviso de teste**.
3. Ao abrir **Minha agenda**, os compromissos autenticados são sincronizados com o Android. Os avisos continuam programados com o aplicativo fechado, sem precisar guardar a senha do usuário em segundo plano.
4. Alterações, cancelamentos e novos compromissos só são sincronizados no dispositivo quando **Minha agenda** é aberta novamente. O modo de economia de bateria pode atrasar alarmes aproximados.
5. Em caso de reinicialização do celular, o sistema reagenda os lembretes locais.

Os avisos não mostram notas, endereço particular ou outros campos privados. A notificação oculta detalhes na tela de bloqueio.

O APK gerado no GitHub Actions usa assinatura temporária de depuração; uma nova compilação pode exigir desinstalar a versão antiga antes de instalar a nova. Antes de gerar futuras versões distribuídas, configurar uma chave persistente de assinatura privada no GitHub Actions.
