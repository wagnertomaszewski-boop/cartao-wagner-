# Mandato em Ação / V2 — biometria cidadã em homologação

Verificação em 09/11/2026. Repositório `wagnertomaszewski-boop/cartao-wagner-`; branch `feature/recuperacao-whatsapp-manual`. Código final: `6c7e14af95d5ae3fb8fcc820e13cace60966fa7e`.

## Arquitetura e entrega

A V2 disponível no repositório é HTML/JavaScript com estrutura de PWA. O contêiner Android existente é Java/WebView. Foi acrescentada a variante cidadã **cidadaoHml** nesse projeto, reutilizando o envelope criptográfico, arquivos e componentes Android. O código Android original do pacote cidadão publicado na Play Store não foi localizado neste repositório.

APK: `Mandato-em-Acao-V2-Homologacao-Biometria-20261109.apk`, 103.940 bytes.
SHA-256: `007115ebd162d974d08b5e854618ebc18b971c0db1ae834add41630a779e24e2`.
Identidade isolada: `br.com.wagnertomaszewski.painelmandato.cidadao.homologacao`.
Nome: **Mandato em Ação Homologação**. Abre a V2 cidadã, preservando foto, cores e conteúdo visual aprovado.

- V2: https://mandato-neon-homologacao.onrender.com/hml/v2/index.html
- Consulta: https://mandato-neon-homologacao.onrender.com/hml/v2/recuperar
- APK e testes: https://github.com/wagnertomaszewski-boop/cartao-wagner-/actions/runs/42718760077
- API, HTTP/MFA e telas: https://github.com/wagnertomaszewski-boop/cartao-wagner-/actions/runs/42718760089

Nenhuma publicação, alteração de pacote da Play Store, migração de produção ou alteração do período de teste fechado foi executada.

## Comportamento implementado

- Ativação opcional somente depois de protocolo e chave completos e validação independente no servidor pelo código nativo.
- BiometricPrompt/CryptoObject reais; chave privada no Android Keystore, autenticação por operação e invalidação por alteração de biometria. A PWA sem ponte Android mantém apenas acesso manual, sem simulação.
- Protocolo/chave/prazo local dentro de envelope AES-GCM, cuja chave é encapsulada por RSA-OAEP. Sem senha, cookie administrativo, características biométricas ou chave de acompanhamento persistida em texto puro.
- Validade local de até 24 horas; expiração/recuo do relógio exige validação manual. Credencial revogada/rotacionada, chave do dispositivo inválida ou outro aparelho não libera acompanhamento.
- Cada desbloqueio consulta o servidor novamente. O JavaScript recebe somente a projeção autorizada, sem a chave. QR, leitura e arquivos usam ações nativas limitadas e continuam validados no servidor.
- Segredo em memória nativa limitado a dois minutos para ações após desbloqueio; descartado ao sair/navegar. Não é enviado em URL.
- Cancelamento/falha e callbacks antigos não autorizam consulta. Substituição do acesso local acontece somente após reconhecimento e nova confirmação no servidor.
- Acesso manual com protocolo + chave preservado. Remover biometria afeta somente o registro local.
- Limpeza dos dados privados ao sair e descarte de respostas assíncronas obsoletas impedem reapresentação automática ao voltar pelo histórico.

## Testes comprovados

| Grupo (última execução) | Aprovados | Falhas | Ignorados |
|---|---:|---:|---:|
| JVM da variante cidadã | 7 | 0 | 0 |
| JVM do Painel compartilhado, regressão | 11 | 0 | 0 |
| JavaScript da ponte e privacidade | 5 | 0 | 0 |
| API/modelos/segurança | 463 | 0 | 2 |
| Autenticação/MFA/HTTP | 6 | 0 | 0 |
| Telas V2/Painel | 38 | 0 | 0 |

Não somar como testes únicos: os cinco casos JavaScript estão na suíte de 38; o novo ensaio integrado PostgreSQL está nos 463; há sobreposição entre HTTP e API.

Os sete casos JVM verificam: credencial incompleta; cifragem/decifragem; cópia para outra chave; expiração/recuo do relógio; formato/versão adulterados; origem/tela autorizada; cancelamento/navegação/destruição invalidando callbacks.

A integração PostgreSQL isolada cadastrou na V2, atualizou andamento e resposta no Painel, recuperou a chave com aprovação, consumiu o código uma única vez e confirmou que a credencial anterior é recusada. Auditoria sem código puro. Esse ensaio usa dados fictícios e não representa reconhecimento biométrico físico.

Compilações debug, cidadaoHml e release passaram. Manifestos e identidades foram conferidos; as permissões biométricas e de localização da homologação não entraram em release.

Os dois ignorados são integrações externas legadas dependentes de configuração/fixture própria. Não são contabilizados como aprovação.

## Interface e implantação reais

Render `mandato-neon-homologacao`: deploy `dep-dbp57egae00c73du299g`, **live**, código `6c7e14a`, concluído em 09/11 às 20:14:40 de Brasília. Banco existente de homologação Neon: `proud-firefly-64745516 / br-lively-snow-bev5ecau / neondb`; sem nova migração de esquema.

Na interface real, protocolo e chave da solicitação exclusivamente fictícia `2026-900013` abriram o andamento **Em análise**, com as duas movimentações cadastradas na integração anterior com o Painel. Ao sair e voltar, o conteúdo privado ficou oculto. No navegador, os controles biométricos ficaram escondidos. Nenhuma nova solicitação nem mensagem externa foi criada para repetir o cenário.

O teste da interface é uma consulta real no serviço e banco homologados; não comprova o fluxo biométrico do APK, que precisa ser instalado no aparelho.

## Correções e commits

- `ef63fa4`: variante Android cidadã, controlador nativo, fábrica compartilhada, credencial cifrada, ponte V2, testes e roteiro.
- `6c7e14a`: descarte de respostas privadas obsoletas e recusa de controles em protocolos.
- Antes da entrega final, foram corrigidos o nome do método de auditoria no novo teste e um erro de sintaxe na proteção adicional. Não ficaram falhas nesses testes na última execução.

Principais arquivos: build.gradle e workflow Android; MainActivity.java; ProtecaoLocal.java; FabricaBiometria.java debug/release; BiometriaCidadao.java; CredencialCidadao.java; TentativasBiometricas.java; CidadaoBiometriaTest.java; v2/recuperar-acesso.html; v2/seguranca/biometria-cidadao.mjs e teste; tela-recuperacao-manual.mjs; cópias empacotadas/manifesto; rota estática no servidor; cidadao-biometria-integracao.test.mjs.

## Pendências e impedimentos concretos

- **Sensor físico não testado:** este ambiente não acessa o sensor Android do proprietário. Reconhecimento correto/incorreto, cancelamento do diálogo do sistema, troca real das digitais e invalidação física do Keystore precisam ser registrados no aparelho. Testes JVM não substituem essa evidência.
- O ciclo biométrico completo no APK com o Painel/Neon exige instalação e teste físico. As partes servidor, contratos e interface foram verificadas conforme descrito.
- Para futura atualização do pacote cidadão publicado, localizar seu projeto Android e assinatura originais, integrar a funcionalidade, homologar e obter autorização expressa. A variante entregue é exclusiva de teste.
- A migração de segurança para produção continua dependendo do backup completo com restauração, compatibilidade, contenção das RPCs legadas e autorização. Nada disso foi aplicado nesta entrega.

## Teste no celular

1. Instalar este APK cidadão, que fica separado do Painel e dos aplicativos publicados.
2. Abrir **Solicitações**, criar somente uma solicitação fictícia e guardar protocolo/chave no próprio ambiente de teste.
3. Consultar com ambos e tocar em **Ativar biometria para este acesso**; confirmar o diálogo nativo.
4. Sair/voltar e usar **Desbloquear acompanhamento com biometria**. Testar cancelamento e digital incorreta antes do reconhecimento correto.
5. Seguir o [roteiro detalhado](CIDADAO-BIOMETRIA-HOMOLOGACAO.md) para revogação pelo Painel, nova digital, arquivos e expiração. Não enviar chaves ou códigos nesta conversa.
