# Candidata de entrega web — 10/11/2026

Estado: preparação real, NÃO publicada. A assinatura do APK HML não bloqueia esta entrega.
Branch: feature/recuperacao-whatsapp-manual. Base inicial: d55208c.

## Publicação e cache conferidos

URL informada pelo proprietário: https://wagnertomaszewski-boop.github.io/cartao-wagner-/v2/index.html
HTTP 200; Cache-Control max-age=600; Last-Modified 29/10/2026 22:17:01 UTC.
SHA-256 do HTML público: 0698dccb8e01e6b7aace8751b22beea91eeae6126373a206d35a7401f48f7893.
Último workflow Pages: 40964540839, sucesso, main, commit dc1c24400a57c408d8d2f93c7f96fefee83e0056.
A leitura administrativa de Settings/Pages exige login GitHub; não foi alterada.
A fonte Android do pacote cidadão não está neste repositório. Sua URL carregada foi
informada pelo proprietário; não foi inspecionada dentro do APK publicado.

A V2 não registra worker próprio atualmente; a raiz pode controlar a V2 se tiver
sido visitada antes. O worker da raiz usa rede primeiro e fallback do shell.
A candidata registra worker exclusivo de /v2/, usa no-store em navegações e módulos
com versão do commit. Não limpa dados de login, não controla Financeiro Pro e não
altera o worker da raiz. O cache HTTP inicial ainda pode reter o HTML antigo por
até o max-age observado; conferir a troca de versão no aplicativo instalado.

Podem chegar pelo endereço existente: formulário, várias fotos, seletor de câmera
quando suportado pelo aplicativo/navegador atual, GPS autorizado, mapa, envio sem
localização, protocolo/chave, galeria privada, status/histórico e recuperação.
Isso exige publicar também o backend e as migrações; somente HTML não resolve.
Novas permissões/bridges nativas, biometria, Keystore e correções do wrapper Android
exigem APK compatível se não estiverem disponíveis na instalação atual. Não se
promete câmera/GPS físicos sem aceite no Android.

## Implementação preparada

O gerador montar-candidata.mjs produz uma sobreposição de arquivos fora da árvore
publicada: V2 e Painel preservados, imagens verificadas por hash, sem as chamadas
por protocolo isolado e sem redirecionamentos de homologação. Não copia /hml/.
Reaproveita os módulos já testados de localização e fotografias. Há captura pela
câmera e seleção múltipla, preservação exata de ponto manual e proteção contra GPS
atrasado. Chaves/recibos ficam na memória, são removidos ao sair da página e nunca
entram na URL, localStorage ou logs.

O adaptador repositorio.mjs grava diretamente em public.solicitacoes e lê os
históricos/respostas já usados pelo Painel. Não copia cidadãos para Neon nem cria
banco paralelo. Mantém protocolos/status/históricos antigos. Novo cadastro tem
chave individual e idempotência; protocolos antigos só ficam acessíveis após
recuperação com identidade/telefone verificados administrativamente.

Fotos novas usam o bucket privado existente anexos-solicitacoes. Arquivos antigos
são vinculados à solicitação no servidor; caminhos externos e travessia são recusados.
O cidadão recebe bytes autenticados, sem URLs públicas de documentos de resposta.

A recuperação produtiva candidata exige sessão Supabase verificada e TOTP recente
pelo claim AMR, não apenas presença de um campo MFA no navegador. Código aleatório
6 dígitos, 5 minutos, 5 erros no máximo, consumo transacional, renovação da chave e
invalidação das anteriores. Armazena HMAC do código e hash da chave. Botão WhatsApp
usa esquema privado whatsapp://, destinatário confirmado, envio manual declarado
separadamente, sem alegar entrega. Nenhum envio real foi efetuado nesta execução.

Entrada Edge preparada no Supabase existente: supabase/functions/mandato-privado.
Não foi implantada. Usa pg 8.16.3, papel dedicado sem BYPASSRLS e segredo separado.
Nunca usa o SUPABASE_DB_URL administrativo automático. O handler reaproveitado
protege as rotas de administração antes da execução. verify_jwt=false aplica-se
somente ao transporte da nova função para permitir cadastro/consulta por chave;
JWT administrativo e TOTP continuam obrigatórios no handler.

## Migrações candidatas, não executadas

1. sql/estrutura-candidata.sql: schema privado, chaves, operações idempotentes,
   anexos, recuperação, auditoria e rate limit persistentes; colunas opcionais de
   origem/consentimento da localização; grants/RLS limitados ao papel privado.
2. sql/contencao-candidata.sql: revoga de PUBLIC, anon e authenticated as três RPCs
   consulta_publica_protocolo(text), consulta_publica_historico_protocolo(text),
   consulta_publica_respostas_protocolo(text); torna documentos-respostas privado;
   preserva a condição administrativa existente de leitura. Exige autorização e
   backend validado. Não pode ser executada antes da atualização dos clientes.
3. sql/backup-solicitacoes-somente-leitura.sql: exportação lógica cifrada antes de
   retornar dados; não realiza alteração no projeto.

Não foi criado papel/credencial de produção, fator MFA, serviço ou banco. A função
produtiva precisa de MANDATO_DATABASE_URL restrita, MANDATO_SEGREDO independente,
MANDATO_ADMIN_UIDS, MANDATO_PUBLISHABLE_KEY, MANDATO_RELEASE_SHA e autorização
explícita. Configuração pública contém somente ambiente/projeto/origem API/versão.

## Inventário produtivo somente leitura

40 solicitações, 79 eventos de status, 10 respostas, zero registros na tabela de
histórico de fiscalização. Três solicitações sem protocolo e zero protocolos
preenchidos duplicados. Não renumeradas nem apagadas; exigem tratamento assistido.
58 objetos Storage: 54 anexos (25.592.840 bytes) e 4 documentos (538.682 bytes).
Bucket anexos-solicitacoes privado; documentos-respostas público; correção preparada.
As três funções por protocolo continuam executáveis por anon/authenticated até a
migração autorizada. Não foi testado acesso a cidadão real para comprovar a falha.
Supabase Auth de produção: zero fatores MFA verificados. O MFA/biometria aprovados
na homologação não devem ser confundidos com cadastramento MFA produtivo.

## Backup e restauração efetivos

Backup de solicitações capturado em 10/11/2026 14:16:06 (Brasília), cifrado no
servidor com AES-256/OpenPGP antes do retorno. Chave privada guardada separadamente,
sem entrar no banco, repositório ou relatório. Nenhuma linha de cidadão foi exibida.
Restauração local em PostgreSQL 18.6, cluster novo removido após conferir hashes:
40 solicitações + 79 históricos + 10 respostas + 0 fiscalizações, quatro tabelas,
constraints/índices e sequência de protocolo conferidos; zero respostas órfãs.
SHA do backup cifrado: 68baf1f17f4c105a78ac7e1884051854487f9e576315a2a58d172a71721491b9.

Limite explícito: é um backup dos dados de solicitações, NÃO uma restauração integral
de produção. Os 58 arquivos estão inventariados, mas bytes Storage, autenticação,
segredos e políticas/funções de plataforma não foram restaurados. Acesso ao painel
Storage nesta sessão exige login Supabase. O backup integral HML anterior continua
válido no escopo HML, mas não substitui esta pendência produtiva.

## Testes e limites

13 casos complementares distintos cobrem formato produtivo, legado/arquivos, fotos,
isolamento, protocolo sem chave, recuperação e rotação, expiração, uso único,
rejeição, cinco erros, MFA/claims, CORS/HTTP, transporte Edge e geração do pacote.
Testes SQL executados em PGlite com dados fictícios representativos. O advisory lock
não é exercitado nessa camada: concorrência/conectividade e deploy real ainda
precisam de ensaio com o papel restrito. Scripts inline dos dois HTMLs candidatos
foram analisados sintaticamente. O CI seleciona os testes novos quando apenas a
candidata mudar; preserva o fluxo de regressão existente para demais mudanças.

As 483 verificações API (2 ignoradas) e 20 Android anteriores não são recontadas.
A candidata não foi testada visualmente com login/MFA produtivo nem em Android
físico. Não afirmar integração de produção concluída a partir de testes locais.

## Conjunto para autorização futura

| Destino | Alterações propostas |
|---|---|
| GitHub Pages/main | Somente a sobreposição gerada V2/Painel e módulos privados; não mesclar toda a branch HML |
| Supabase pmmsdjozyyxkbuqlkfpb | Papel/segredos restritos, estrutura aditiva, função mandato-privado, contenção de RPCs e documentos privados |
| Render/Neon | Manter exclusivamente a homologação; nenhum dado produtivo encaminhado a esses ambientes |
| Play Console/Android | Nenhuma publicação, assinatura, canal ou lista de testadores alterada nesta entrega web |

Antes de autorizar: autenticação segura para exportar/restaurar os arquivos Storage;
cadastrar/verificar MFA produtivo pelo proprietário; ensaiar papel restrito/API;
aceite no aplicativo instalado (câmera, galeria, GPS permitido/negado, mapa, envio e
status); conferir a entrada Edge no runtime e fechar a revisão do pacote.

Implantação proposta após autorização: backup atualizado e validado -> estrutura
aditiva -> API privada validada -> publicar clientes privados -> contenção imediata
dos três RPCs/bucket -> testes mínimos com registro autorizado -> monitoramento.
Coordenar manutenção breve para evitar janela de clientes antigos/incompatíveis.

Reversão: manter revogações e documentos privados; voltar somente cliente privado
compatível ou manutenção do acompanhamento. Preservar novas gravações/auditoria;
não restaurar por cima do banco vivo. Restaurar em destino isolado, reconciliar
alterações posteriores e obter autorização para qualquer substituição. Nunca
reativar consultas somente por protocolo, nem retornar documento a bucket público.

## Evidência final desta preparação

Implementação: f4530bec61543fc4530ce02bb368e8e788569751.
Correção do seletor CI: 397aa0321d00227831161b907ae10911b249f1e3.
CI 42866057186 / job 130004567339: **13 aprovados, 0 falhas, 0 ignorados**;
entrada Edge passou no deno check; suíte antiga foi corretamente ignorada.
Na primeira execução (42865742390), o seletor tinha caminho relativo incorreto e
acionou a suíte antiga. Isso foi corrigido, e essa rodada não é contada como nova
cobertura. Nenhum teste Android foi reexecutado nesta etapa web.

HTML público comparado byte a byte ao commit Pages dc1c244: correspondência confirmada.
A candidata preservou cinco imagens embutidas por hash. Scripts inline de V2/Painel
analisados sintaticamente. Revisão visual da candidata local **bloqueada**:
Cloud Browser recebeu ERR_CONNECTION_REFUSED no servidor local; alternativa
Chromium local encontrou provedor AT-SPI indisponível. Não equivale a aceite visual.

A sessão do Supabase Dashboard exibiu Sign in ao tentar abrir o Storage. É necessário
login interativo para concluir a exportação privada dos arquivos. Não foi solicitado
que credenciais, chaves ou códigos fossem enviados ao chat.
