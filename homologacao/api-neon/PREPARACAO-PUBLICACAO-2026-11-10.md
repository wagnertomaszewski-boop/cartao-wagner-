# Preparação de publicação — 10/11/2026

## Situação verificável

Branch autorizada: `feature/recuperacao-whatsapp-manual`. Base desta preparação:
`35cb1502045049aff0163ca2f23d9b0243ec491e`. Render HML está live no commit
`f36bf2d46f7dbe0138d937b6de73bffd54aab382`, deploy `dep-dbph4g6417fc739nadq0`.
Nenhuma alteração de produção ou envio à Play Store foi executado.

Evidência preservada: relatório FOTOS-MAPA-BACKUP-HML-2026-11-10.md,
483 testes API aprovados, 2 ignorados; 20 Android aprovados. Não somar rodadas
sobrepostas. Esses resultados anteriores não substituem o aceite físico restante.
Backup HML capturado em 2026-11-10T12:43:11Z, restaurado em PostgreSQL 18.6
isolado, 34 tabelas, 12 sequências, 15 funções, 8 políticas e 1 trigger.
Relatório persistente: libfile_ba6e2bf7505c819194e4ca7d2c53cf86, versão 1.
O backup de banco não substitui a custódia dos segredos de configuração Render.

## Assinatura: causa e correção

O workflow antigo assinava APK debug com identidade temporária de cada runner.
Os dois APKs HML comparados têm o mesmo pacote e assinaturas diferentes.
A chave privada original não foi localizada no repositório nem nas pastas Android
locais verificadas. O conector não permite consultar a existência dos GitHub Secrets.
Não é possível reconstruir uma chave privada a partir do certificado do APK.

Agora a variante HML fica sem assinatura na ausência da chave existente; o workflow
executa compilação/testes, mas não libera APK instalável. Para liberar APK, exige
keystore HML existente e referência de certificado conferida, ambos configurados
em segredos protegidos; rejeita configuração incompleta e assinatura divergente.
Nenhum material de assinatura é publicado em artefatos ou logs. Não gerar nova
identidade, não desinstalar o aplicativo atual e não reenviar o APK incompatível.

Configuração segura por quem detém a chave, sem compartilhar valores no chat:
PAINEL_HML_KEYSTORE_BASE64, PAINEL_HML_KEYSTORE_PASSWORD, PAINEL_HML_KEY_ALIAS,
PAINEL_HML_KEY_PASSWORD, PAINEL_HML_CERT_SHA256. A referência deve ser extraída
localmente do APK efetivamente instalado. Uma referência do APK novo incompatível
não serve para comprovar compatibilidade. Guardar cópia independente criptografada.

Pacotes preservados:
- Painel Play: br.com.wagnertomaszewski.painelmandato.
- Painel HML: br.com.wagnertomaszewski.painelmandato.homologacao.
- Cidadão Play: com.wagnertomaszewski.mandatoemacao.
- Wrapper cidadão HML: br.com.wagnertomaszewski.painelmandato.cidadao.homologacao.

Conferência visual somente leitura na Play Console nesta execução: cidadão em
**Closed testing**, Painel em **Internal testing**, nenhum aplicativo em Production.
Painel protegido por Play App Signing, com “Releases signed by Play”. Nenhum canal,
testador ou release foi alterado. A chave Play não substitui a chave debug HML.
Workflow de bundle Play existente usa PAINEL_KEYSTORE_* e foi preservado.
Ainda falta conferir sua chave de upload e versionCode aceito antes de preparar
AAB final. O projeto Android do pacote cidadão publicado não está identificado
neste repositório; não tratar o wrapper HML como atualização dele.

Se a chave de upload Play estiver perdida, o titular pode solicitar reset da
**upload key**, mantendo a identidade **app signing key** gerenciada pelo Google.
Isso não recupera chave debug perdida. Não iniciar reset sem autorização.
Fontes: https://developer.android.com/studio/publish/app-signing
https://support.google.com/googleplay/android-developer/answer/9845334?hl=pt-BR

## Aceite físico curto — sem reinstalar

Usar Chrome Android para os fluxos web; preservar o APK biométrico instalado.
V2: https://mandato-neon-homologacao.onrender.com/hml/v2/index.html
Cadastro: https://mandato-neon-homologacao.onrender.com/hml/v2/solicitar
Painel: https://mandato-neon-homologacao.onrender.com/hml/painel/recuperacoes

1. Criar solicitação fictícia com descrição identificada TESTE; selecionar duas
   fotos sem dados pessoais. Em tentativa separada, tirar foto pela câmera.
2. Autorizar GPS e conferir ponto; depois negar GPS em outra tentativa e escolher
   ponto manual. Confirmar que ele não muda com GPS atrasado. Também enviar sem GPS.
3. Enviar uma vez, guardar protocolo e chave privadamente, conferir no Painel com
   login e MFA. Abrir/ampliar fotos e conferir ponto e origem GPS/mapa.
4. Atualizar para Em análise; consultar na V2 com protocolo e chave. Sem chave,
   não deve abrir dados nem anexos. Não enviar a chave em capturas ou grupos.
5. Recuperação: pedir análise; aprovar com justificativa e MFA recente; gerar código
   de 6 dígitos. Novo envio real por WhatsApp depende de autorização específica.
   Abertura não comprova entrega; só confirmar envio após tocar Enviar.
6. Validar código e renovar chave; chave anterior, código reutilizado/incorreto e
   código com mais de cinco minutos devem ser recusados. Conferir auditoria.
7. No APK já instalado, confirmar login biométrico sem alterar cadastramento das
   digitais. Teste do novo mapa externo no APK depende de assinatura compatível.

Registrar modelo/Android, horário, protocolo fictício e resultado; não registrar
chave, código temporário, telefone pessoal, biometria ou credenciais. Câmera, GPS
real, seletor Android e biometria não podem ser atestados por testes de desktop.

## O que é web e o que exige Android

| Alteração | Canal necessário | Condição |
|---|---|---|
| Formulário, múltiplas fotos, mapa, galeria privada, status e mensagens | Web V2/Painel + API | Portar para configuração de produção e validar integração antes de Pages |
| Protocolo/chave, recuperação, auditoria e proteção de anexos | Backend + migrações e permissões | Não pode ser entregue somente copiando HTML para Pages |
| Biometria/Keystore, permissões GPS/câmera e abertura de mapas pelo WebView | Android | Mesmo pacote, assinatura compatível e versionCode superior |
| Conteúdo web dentro do app existente | Depende da URL e arquitetura do app publicado | Conferir origem usada e cache antes de dispensar atualização nativa |

Não copiar `/hml/` para o público: o cadastro usa dados fictícios, API isolada,
telefone de teste e controles próprios de homologação. Não promover registros do
Neon HML para cidadãos. Não mudar foto, identidade visual nem substituir APK Play.
Manter o canal fechado e sua lista de testadores; não migrar testadores para interno
nem criar aplicativo novo. Não prometer aprovação da Play ou contagem automática
de dias sem conferir os requisitos exibidos para a conta.

## Implantação e reversão — preparados, NÃO executados

1. Encerrar aceite físico; recuperar assinatura compatível; identificar fonte do
   Android cidadão e confirmar keystore de upload/versões no console.
2. Fixar SHA aprovado e inventário de arquivos web/backend/Android. Revisar as
   migrações existentes e o adaptador legado com dados fictícios representativos.
3. Antes de produção, criar backup independente atualizado de banco/anexos e
   custodiar configurações/segredos fora do repositório. Restaurar esse backup
   isoladamente e comparar contagens, hashes, históricos, anexos e permissões.
   O ensaio HML já aprovado não equivale ao backup futuro de produção.
4. Preparar API privada de produção, autenticação/MFA, origens exatas e função
   restrita; conferir que protocolo sozinho não libera dados/anexos/coordenadas.
   Não usar AUTH_HML_SECRET, schema auth_admin_hml ou dados fictícios em produção.
5. Exigir autorização expressa para o conjunto concreto: SHA, migrações, serviço,
   frontend e eventual AAB/canal. Aplicar migrações aditivas antes dos clientes;
   não sobrescrever protocolos, status, histórico ou registros existentes.
6. Após validar clientes privados e recuperação, aplicar o bloqueio legado do
   rascunho `sql/rascunhos/bloquear-rpcs-legadas.sql` somente com autorização.
   As três RPCs de protocolo isolado permanecem pendência de segurança produtiva.
7. Publicar web aprovada e, quando necessário, AAB no canal apropriado existente.
   Validar cadastro → Painel → status → consulta privada e auditoria com fixture
   autorizada isolada; não inserir dados de cidadãos para testar.
8. Reversão: parar publicação, preservar auditoria e novas gravações, voltar a
   versão privada compatível anterior ou colocar acompanhamento em manutenção.
   Nunca reabrir consulta somente por protocolo. Não remover colunas/históricos
   nem sobrescrever banco vivo. Restaurar backup em instância isolada, reconciliar
   gravações posteriores e obter autorização antes de qualquer substituição.

## Bloqueios reais para liberação

Chave privada HML original não localizada; APK novo não é atualização compatível.
Aceite físico de câmera/GPS/seleção de fotos pendente. Fonte/assinatura do Android
cidadão publicado não confirmadas. Portabilidade do backend e contenção das RPCs
legadas em produção requerem preparação final e autorização; nenhuma foi aplicada.
Não há autorização para publicação definitiva ou migração. Não declarar 100%.
