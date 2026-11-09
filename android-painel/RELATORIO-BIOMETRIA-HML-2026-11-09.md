# Biometria nativa — resultado de homologação (09/11/2026)

## Entrega

APK `Painel-Mandato-Homologacao-Biometria-20261109.apk`, versão `1.1.1-hml-bio1`, applicationId `br.com.wagnertomaszewski.painelmandato.homologacao`.

- Código final: `d5bc281baa088604c441c9bbc11cc0a32a1a24a8`.
- Workflow: https://github.com/wagnertomaszewski-boop/cartao-wagner-/actions/runs/42713992744 — success.
- APK: 91.024 bytes; SHA-256 `2c644dc6a8338e535fd18f50cb0e47b246a8040082273960ec48c6d4e746f3aa`.
- Artifact APK: `13717172188`; artifact JUnit: `13717636359`.
- Somente branch `feature/recuperacao-whatsapp-manual`. Sem alteração no Render, Neon, Supabase de produção, aplicativos publicados ou Play Store.

## Implementado

O Painel existente usa WebView. A biometria foi implementada nativamente, em `src/debug/java`, com Android BiometricPrompt/CryptoObject e chave privada no Android Keystore, sem página HTML ou ponte JavaScript para simular autenticação.

Ativação opcional pelo botão nativo **Biometria**, somente após confirmação independente da sessão e MFA recente no servidor autorizado. A funcionalidade armazena somente um envelope cifrado da sessão; não recebe nem salva senha ou características biométricas. O token precisa existir temporariamente na memória do WebView enquanto o painel está em uso.

Ao sair, o conteúdo é ocultado, o WebView é limpo e o retorno exige biometria ou login tradicional. Sessão expirada/revogada, MFA vencido, alteração/invalidação da chave ou falha criptográfica exigem login completo e nova ativação. A biometria nunca renova o MFA.

Depois de retomada biométrica, requisições que modificam dados são recusadas pela integração nativa até novo login com senha e MFA. A validação própria do servidor continua em vigor. Falha/cancelamento, rede indisponível e callbacks atrasados não concedem acesso. Capturas e prévias de tarefas ficam protegidas na variante de teste.

A variante release tem implementação vazia da integração biométrica. Sua compilação passou e os manifestos foram conferidos sem as permissões biométricas e de localização de homologação. Nenhuma versão release foi publicada.

## Testes efetivamente executados

Última execução JUnit: **11 testes, 11 aprovados, 0 falhas, 0 erros, 0 ignorados**.

Cobertura: cifragem/restauração, original ausente do envelope, integridade AES-GCM, chave incorreta, truncamento/versão/tamanho, origem autorizada, seleção exclusiva do cookie de sessão, cancelamento/falha mantendo bloqueio, sessão expirada/revogada/MFA inválido, política após invalidação e exigência de novo login nas operações após retomada.

Também passaram `:app:assembleDebug`, `:app:compileReleaseJavaWithJavac` e as verificações dos manifestos/identidade do APK.

Não somar execuções intermediárias como testes novos. A primeira compilação falhou por ambiguidade de importação de CookieManager; corrigida. As execuções posteriores verificaram as correções de ciclo de vida. Suítes de backend e V2, cujo código não mudou nesta implementação, não foram reexecutadas.

## Commits e arquivos

- `ed618c4`: implementação inicial, envelope, política, 11 testes, workflow e roteiro.
- `44c801f`: proteção contra restauração em segundo plano.
- `cda7ef1`: correção da importação do CookieManager.
- `cd71f12`: descarte de callbacks cancelados e restaurações obsoletas.
- `d5bc281`: liberação de nova tentativa segura após interrupção do prompt.

Arquivos principais: MainActivity.java; debug/BiometriaPainel.java, EnvelopeSessao.java e PoliticaBiometria.java; release/BiometriaPainel.java (vazia); testDebug/BiometriaSegurancaTest.java; manifesto debug; app/build.gradle; workflow painel-v17-apk.yml; BIOMETRIA-HOMOLOGACAO.md.

## Pendências e teste físico

**Não foi executado teste em sensor Android físico ou emulador com biometria.** O ambiente desta execução não fornece acesso ao sensor do aparelho. As validações JVM de cancelamento e invalidação verificam a política e não comprovam o comportamento do diálogo ou da chave física.

No aparelho, seguir [roteiro completo](BIOMETRIA-HOMOLOGACAO.md): ativação após MFA; reconhecimento incorreto; cancelamento; sair/voltar; nova tentativa após interrupção; falta de rede; sessão expirada/revogada; novo login antes de emitir/aprovar; inclusão/remoção de impressão digital; desativação e alternativa tradicional.

Se a assinatura debug anterior causar conflito, remover somente o aplicativo **Painel do Mandato Homologação** anterior e instalar o novo. Isso apaga a sessão local, sem apagar solicitações no servidor. Não remover a versão publicada.

## Continuidade V2 preservada

A V2 permanece em https://mandato-neon-homologacao.onrender.com/hml/v2/index.html, separada do endereço público. Login e MFA administrativos reais foram confirmados pelo proprietário nesta rodada. A solicitação exclusivamente fictícia `2026-900013` foi criada na V2, recebida no Painel e atualizada para **Em análise**, revisão 1, com histórico e auditoria preservados. O ciclo visual completo de recuperação desse novo cenário ainda não foi concluído; não o apresentar como novo teste integral aprovado.
