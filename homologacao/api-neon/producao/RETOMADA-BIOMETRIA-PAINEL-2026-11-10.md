# Candidata V2 web + Painel Android — NÃO PUBLICADA

Base remota conferida: f05f9b76033278a816df7aaea87e28e6bec67adb, branch feature/recuperacao-whatsapp-manual. Os commits f4530be,397aa03,9da8234 são ancestrais. Nenhuma alteração em main, Pages, banco produtivo ou Play Console.

## Correções desta retomada

- O resolvedor administrativo candidato confere o session_id no banco depois de validar a identidade no Auth. getUser sozinho não garante encerramento imediato de JWT após logout. Sem consulta ativa, falha fechada.
- Novo SQL candidato `sql/sessoes-candidata.sql`: função privada que devolve apenas existência de sessão do usuário e validade not_after, sem conceder leitura de auth.sessions ao backend. EXECUTE revogado de PUBLIC/anon/authenticated. Requer aprovação explícita e estrutura privada anterior. Não aplicado.
- Rota POST candidata `admin/sessao/validar`: mesmos controles de identidade administrativa, sessão ativa, origem e MFA recente. Não retorna tokens ou informações pessoais.
- O montador deixa de incluir as antigas chamadas diagnósticas do Painel ao Render HML. Tokens produtivos não devem ser enviados à homologação. Os controles novos usam somente a configuração produtiva preparada.
- Logout web candidato solicita encerramento local ao Auth. No Android candidato, limpa também o cofre nativo pelo comando de saída sem segredos.

## Biometria para o MESMO aplicativo Play

A variante release anterior continua sem biometria. Foi criada a variante de compilação playCandidato, no mesmo módulo/repositório, com applicationId br.com.wagnertomaszewski.painelmandato, sem sufixo .homologacao e sem novo aplicativo/assinatura. Ela não é distribuída automaticamente.

Reutiliza a implementação nativa de homologação: BiometricPrompt CryptoObject, envelope AES-GCM/RSA-OAEP e Android Keystore com autenticação por operação e invalidação na alteração do cadastro biométrico. A implementação HML original foi preservada.

Diferenças de transporte necessárias: HML usa cookie BetterAuth; o aplicativo oficial usa sessão Supabase. A candidata Android lê exclusivamente o adaptador da página administrativa exata, valida a sessão com o servidor antes de ativar e após cada desbloqueio e guarda somente access_token e expiração no envelope cifrado. Não guarda senha, biometria ou refresh token. A página mantém a sessão nativa em memória e remove os antigos tokens de autenticação do localStorage, preservando os demais dados locais.

A versão web antiga é recusada pelo teste de compatibilidade antes de liberar a tela nativa. O login manual permanece disponível com a candidata web correspondente. Agenda continua presente e conserva login próprio, com armazenamento em memória no Android; não recebe ativação biométrica de cidadão.

Cancelamento, indisponibilidade de rede e biometria inválida não abrem a sessão. Expiração, revogação, troca de aparelho ou invalidação do Keystore exigem login completo. Nesta candidata conservadora, o servidor também exige MFA dos últimos cinco minutos no desbloqueio biométrico. A biometria não renova MFA. Depois de um desbloqueio, alterações administrativas exigem novo login completo; encerramento de sessão continua permitido.

`painel-biometria-candidata.yml` compila e testa a variante, gera AAB SEM ASSINATURA e confere pacote/permissões. Não utiliza keystore e não faz upload à Play. O versionCode 4 do job é provisório para compilação, NÃO confirmado como superior ao canal. O release existente continua com default 3. Não instalar este AAB: ele é uma evidência técnica, não APK nem atualização pronta para os testadores.

Para preparar o AAB assinado final faltam: login na Play Console, conferência do maior versionCode do canal existente, e validação da chave de upload original contra o cadastro da Play. Não criar chave nova, não substituir pacote, não desinstalar o aplicativo, não alterar canal/testadores. O workflow antigo bundleRelease não deve ser usado para anunciar biometria: ele ainda seleciona a variante anterior.

## Verificação e limites

- Nesta retomada: 10 testes direcionados Node aprovados, zero falhas/ignorados. Incluem cinco casos novos de revogação, endpoint, armazenamento nativo/manual e SQL em PGlite. Os outros cinco são verificações afetadas já existentes; não somar como casos inéditos.
- Compilação Android/3 testes JVM novos: resultado verificável no workflow da candidata. Conferir a execução antes de declarar compilado.
- Os 483 testes API e 20 Android anteriores são histórico preservado. Não foram executados novamente localmente nem somados a estes resultados.
- PGlite exercita a função SQL em banco isolado sintético; não substitui teste integrado no Supabase após implantação autorizada.
- Nenhum teste físico da nova candidata Android foi realizado. A confirmação física anterior é apenas do APK HML.
- Não houve novo envio WhatsApp, captura GPS física ou criação de dados reais.

## Estado externo conferido sem alteração

Render mandato-neon-homologacao: não suspenso, branch autorizada, serviço já existente. A produção continua no Supabase pmmsdjozyyxkbuqlkfpb. Consulta agregada confirmou 40 solicitações,58 arquivos nos dois buckets de solicitações/respostas e ZERO fatores MFA verificados na conta de Auth do aplicativo.

O backup das quatro tabelas foi restaurado isoladamente anteriormente; faltam os bytes dos 58 arquivos do Storage e sua restauração/hash. Não chamar esse backup produtivo de integral. Nenhum arquivo privado foi copiado nesta retomada, pois falta acesso Storage autenticado. Não repetir o dump das tabelas para aparentar avanço no backup de arquivos.

A Play Console redirecionou para escolha de conta Signed out. Não foi possível reconfirmar o canal/versionCode atual. Não foi realizado login automático nem tentativa de publicação.

## Conjunto para futura autorização

1. Web: overlay gerado pelo montar-candidata.mjs, v2/index.html, módulos privados, configuração pública produtiva, Leaflet existente, worker restrito a /v2/, painel/index.html e painel/agenda.html. Fotografia/identidade preservadas por hash. Não copiar /hml/ para o público.
2. Backend: candidata Supabase Edge `mandato-privado`, repositório privado, arquivos, MFA, sessão ativa. Ainda não implantada nem configurada com credenciais produtivas.
3. SQL: estrutura-candidata.sql, sessoes-candidata.sql, contencao-candidata.sql. Corrigem as três RPCs legadas no servidor e tornam documentos-respostas privado, preservando a autorização administrativa. Antes de executar: backup integral restaurado, autenticação/MFA real e aceite.
4. Android: AAB técnico playCandidato sem assinatura. Assinatura/versão final dependem das verificações acima. Nenhum canal será escolhido ou alterado automaticamente.
5. Serviços afetados somente após aprovação: GitHub Pages existente e Supabase Auth/Database/Storage/Edge existentes. Render/Neon HML preservados. Sem banco novo e sem alteração no teste fechado do aplicativo cidadão.

## Implantação e reversão

Concluir Storage e restauração dos arquivos; concluir MFA do proprietário e conferência autenticada; validar candidata em homologação e aparelho físico. Fixar commit aprovado e hash dos artefatos; configurar credenciais mínimas em ambiente seguro; aplicar estrutura/sessões; implantar backend; testar consultas privadas; realizar contenção e troca web coordenadas após autorização. Não deixar intervalo de publicação em que consulta pública continue aceitando protocolo isolado.

Reversão: manter bloqueadas as três RPCs e manter documentos privados. Usar manutenção segura se cliente/backend novo falhar. Não restaurar telas antigas com consulta apenas por protocolo. Restaurar dados/arquivos somente em destino isolado e conferir hashes antes de qualquer decisão produtiva. Atualização Android exige pacote/assinatura e versionCode válidos no mesmo canal; não prometer downgrade pela Play.

## Participação necessária

Login do proprietário no navegador remoto: Play Console para canal/versão/assinatura; Supabase para backup privado do Storage; Painel para conferência autenticada e cadastro/verificação MFA da própria conta. Nunca enviar senha, segredo TOTP ou códigos no chat. Cadastro MFA produtivo não será executado pelo agente sem confirmação específica.

Celular: câmera/fotos múltiplas, GPS permitido/negado, ponto manual exato, solicitação V2 recebida no Painel, atualização de status, consulta por protocolo+chave, recuperação manual autorizada, e biometria da candidata oficial depois de pacote assinado compatível. Não afirmar esses testes físicos como concluídos.

## Correções após a primeira compilação

O primeiro CI confirmou 21 testes candidatos aprovados, mas encontrou dois parâmetros TypeScript sem tipo na entrada Deno e avaliação inválida de versionCode no DSL Gradle. Ambos foram corrigidos antes de repetir a compilação afetada. Também foi removido o cartão antigo de chaves desabilitadas da candidata (o fluxo real de recuperação o substitui). Os jobs existentes disparados automaticamente pelo push têm sobreposição e não representam casos adicionais aos históricos. Conferir os resultados do commit corretivo para o estado final da compilação.

## Evidências finais da compilação — 10/11/2026

Código candidato: 09f36b99c4279484c84a5f4c8a0b5fe86267db61. Correções anteriores: 2b9da4e9323f7282e0e599c55537fc198f6d521d e 6100fada5017f3a19ee5277ae4c61b7848e2214f. O último ajuste corrigiu a referência do contador de callbacks e impediu que o carregamento da página invalidasse a restauração em andamento.

- CI candidata web/API 42883910287: 21 aprovados, 0 falhas, 0 ignorados; `deno check` aprovado. A alteração posterior foi somente Android; a API não foi repetida. Os 10 casos locais direcionados estão contidos nesses 21 e não são somados.
- CI Android candidato 42884296420: compilação e bundle aprovados; JUnit extraído do artefato confirma 3 testes, 0 falhas, 0 erros, 0 ignorados. Pacote e permissões conferidos, sem assinatura e sem publicação.
- CI Android HML 42884296659: JUnit confirma 20 testes, 0 falhas, 0 erros, 0 ignorados. São os testes existentes, não 20 casos novos. APK HML não foi gerado porque não havia assinatura existente validada disponível no job.
- Artifact Android 13796105219: `Painel-Play-Candidata-NAO-ASSINADA`, integridade ZIP verificada. SHA256 ZIP: 1f2ed5f959bb286af88df84d75e1f1ed9de7c185a7379d1797d20f78d35dcba5.
- AAB técnico extraído: 83515 bytes, SHA256 6bcda7525cf2ddf9e37823f8b35005bcc4bd7228bc881d4015a50a64ef51185c. Não instalável diretamente e não pronto para upload assinado.
- Overlay web regenerado fora da árvore pública, configurado para o commit 09f36b9, com cinco imagens incorporadas preservadas. Nenhum arquivo da árvore pública foi substituído. Scripts inline da V2, Painel e Agenda tiveram a sintaxe conferida.

Os erros intermediários de compilação foram corrigidos; não houve teste funcional reprovado nas execuções finais acima. Essas contagens são separadas por escopo, sem somar sobreposição com as 483 verificações antigas ou entre rodadas.

Ainda faltam a conferência autenticada das interfaces, a cópia/restauração dos 58 arquivos privados, o MFA real do proprietário e a conferência do canal/versionCode/chave de upload na Play Console. O novo transporte biométrico Supabase ainda precisa de teste integrado e físico com o conjunto web/backend correspondente antes de distribuição. O sucesso físico anterior pertence à biometria HML, não a esta candidata.

A navegação retomada alcançou a página de login do Supabase. Nenhuma credencial foi recebida no chat, nenhum fator MFA foi cadastrado e nenhuma permissão produtiva foi modificada. A aprovação final de publicação continua pendente.
