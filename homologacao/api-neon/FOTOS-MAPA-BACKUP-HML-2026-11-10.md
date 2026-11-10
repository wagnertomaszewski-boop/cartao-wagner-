# Fotos, localização e backup — homologação integrada

Execução em 10/11/2026 (Brasília), exclusivamente na branch
`feature/recuperacao-whatsapp-manual`, Render `mandato-neon-homologacao` e Neon
`proud-firefly-64745516` / `br-lively-snow-bev5ecau` / `neondb`.
Não houve alteração da V2 pública, Painel publicado, Play Store ou banco de produção.

## Preservação e correções

Os recursos originais de localização foram localizados em
`v2/solicitacao-localizacao.js` (GPS, seleção e confirmação no mapa) e
`painel/mapa-solicitacoes.js`. Essas fontes públicas e as fotografias aprovadas
não foram modificadas. A tela anterior da homologação aceitava somente um arquivo,
GPS e coordenadas em texto; faltavam seleção manual e visualização das fotos.

- `21dc82f`: múltiplos anexos (até 20, limite atual da API de 1 MB por arquivo),
  validação antes do cadastro, reenvio somente de uploads pendentes, mapa manual,
  coordenadas sem arredondamento, origem GPS/mapa e precisão do GPS, galeria privada
  e ampliação no Painel. Reutiliza o armazenamento BYTEA já existente no Neon.
- `52b3f0c`: corrigiu o Referer de imagens cartográficas para enviar somente a
  origem. A configuração inicial `no-referrer` provocou recusa do provedor;
  depois da correção, o mapa de Cristal carregou efetivamente na interface.
- `f36bf2d`: liberação Android estrita para a URL de coordenadas do Google Maps,
  apenas com gesto do usuário; bloqueia outros hosts, protocolos, fragmentos,
  coordenadas inválidas e parâmetros adicionais. Ponte biométrica não alterada.

A fonte do ponto permanece diferenciada em `localizacaoOrigem`. Um GPS atrasado
não substitui escolha posterior no mapa. Recusa/indisponibilidade de GPS não
obriga localização e não impede marcação manual. A retirada da autorização limpa
as coordenadas. Coordenadas são visíveis somente ao administrador com MFA;
consultas cidadãs não retornam localização privada. O mapa externo recebe apenas
as coordenadas escolhidas quando o administrador toca no link.

## Interface real e sincronização

Caso fictício `2026-900019`, criado pela interface da V2:

- Descrição: solicitação fictícia com duas fotos e ponto manual.
- Coordenadas escolhidas: `-31.004570880073523, -52.04360961914063`.
- Mesmo par confirmado no Neon e exibido no Painel, com origem `mapa`.
- Dois PNGs distintos (`foto-teste-mapa-a.png`, `foto-teste-mapa-b.png`),
  carregados pela seleção múltipla real do navegador.
- Catálogo administrativo recebeu a solicitação; as duas fotos foram abertas no
  visualizador ampliado após autenticação com MFA. Descrição completa conferida.
- Marcador privado e link externo foram criados com as coordenadas exatas.
- Status alterado no Painel para **Em análise**, com justificativa e responsável.
  V2 consultada com protocolo e chave exibiu o status atualizado e os dois anexos.
- Download do arquivo existente sem chave: **HTTP 403**, sem base64.
  Consulta da solicitação somente com protocolo: **encontrado=false**.
- Após vencer o MFA, o Painel ocultou gestão, fotos e demais dados privados.

O primeiro deploy constou como live, mas o endereço ainda servia a tela anterior.
Houve uma reconstrução sem cache (`dep-dbpgp13m8hqs73dsdm0g`); após ela, a
interface passou a exibir mapa e seleção múltipla. A divergência não foi tratada
como aprovação. O ajuste de Referer foi feito depois de observar a recusa real.

## GPS e celular — limites da evidência

GPS real de aparelho não foi simulado nem declarado aprovado. Os testes
controlados validam estado GPS, precisão, ausência de autorização, coordenadas
inválidas, ausência de localização e resposta tardia após escolha manual.
A captura física, a recusa de permissão no Android, seleção da câmera/galeria,
zoom por toque e abertura no aplicativo de mapas continuam dependendo do aparelho.

Não foi realizado novo envio pessoal no WhatsApp. Código, validade de cinco
minutos, uso único, renovação, MFA e auditoria permanecem os já homologados;
os testes de cliente/HTTP pertinentes continuaram passando. Abertura nunca
significa entrega. Novo envio pessoal precisa de autorização específica.

## Testes

| Evidência final | Aprovados | Falhas | Ignorados |
|---|---:|---:|---:|
| CI API, commit `f36bf2d`, run `42818675522` | 483 | 0 | 2 |
| JVM Android, run `42818675508` | 20 | 0 | 0 |
| Local direcionado após integração de fotos/mapa/HTTP | 10 | 0 | 0 |
| Local após ajuste de Referer | 4 | 0 | 0 |

As linhas locais se sobrepõem ao CI; não somar como casos únicos.
Os 20 JVM incluem 11 da biometria do Painel preservada, 7 da ponte cidadã
existente e 2 da navegação restrita de mapas. Não são testes físicos.
Os dois ignorados da API são as integrações antigas com configuração/fixture
externa, preservadas como exclusões explícitas.
O workflow Android compilou APKs de homologação e conferiu a separação dos
manifestos release; nada foi enviado à Play Store.

## APK: bloqueio real de atualização

O novo APK foi compilado e seu ZIP foi conferido com o SHA-256 informado pelo
GitHub (`e216d608ba64b40c68ace779c950ccaa2c730f408c83fadb923d4c1b7287d0e6`).
A leitura dos certificados do bloco APK v2 mostrou:

- Anterior (biometria aprovada):
  `5607e12a2dafe0d5ca50169b4760118b367395361e3a41a86b600a523706e72d`.
- Novo (mapas):
  `32b184cafd6f8012474fcca71e344d25ba923ec3972a9aaee22992b3280ddf44`.

São certificados diferentes. A versão instalada foi preservada; o pacote novo
não foi apresentado como atualização compatível nem instalado. O workflow atual
usa assinatura debug temporária. Resolver assinatura persistente/compatível ou
obter autorização para reinstalação controlada de homologação, com novo login
e ativação da biometria. Não desinstalar o aplicativo em funcionamento nesta etapa.
O mapa interno e a alternativa de copiar coordenadas estão disponíveis nas telas;
a abertura externa da versão Android nova depende dessa atualização e teste físico.

## Backup integral do banco de homologação e restauração

O dump direto não pôde usar a rede PostgreSQL por falha de DNS. Foi utilizada a
conexão autorizada do Neon, com uma exportação lógica de leitura em uma instrução,
limitada aos quatro schemas não sistêmicos de homologação. Não foi criada branch
Neon nova nem banco operacional paralelo.

Fotografia final: **10/11/2026, 09:43:11 de Brasília**, após fotos e status do caso.
Inclui dados de autenticação, sessões, MFA cifrado, auditoria e anexos BYTEA.
Restaurada efetivamente em um PostgreSQL **18.6 local isolado e novo**, sem
sobrescrever a origem. Resultado:

- **34 tabelas**, todos os registros comparados por SHA-256 canônico,
  incluindo bytes dos anexos.
- **12 sequências**, seus valores e estado `is_called` conferidos.
- **15 funções, 8 políticas RLS e 1 gatilho**, além de constraints, índices e grants.
- Papel operador continua sem UPDATE da auditoria na restauração.
- Ensaio final: **4,68 segundos**; não é RTO garantido de produção.
- Roles recriadas como NOLOGIN e propriedade adaptada ao restaurador local.
  Não exporta senhas de papéis PostgreSQL, configuração/segredos do Render,
  Supabase/Storage de produção ou outros serviços externos.

Arquivo cifrado AES-256-GCM, com descriptografia conferida:

- SHA-256 da exportação: `9910ac75e4721912c497e010b85eff0a66f50b6c02a33b7b46ca4687021f7493`.
- SHA-256 do cifrado: `0531f2b26d92ed3da0b7c65bfda4c9f9a57b29d02f06e9d744470b67a770b2b0`.
- Tamanho cifrado: **209.425 bytes**.
- Backup, chave de abertura e relatório de restauração foram guardados
  separadamente em arquivos privados do proprietário, com histórico de versões.
  Nenhuma chave, OTP, telefone pessoal ou dado de autenticação entrou no Git.

A recuperação completa do aplicativo em outro host também precisa conservar os
segredos de configuração do Render, especialmente o segredo usado na autenticação
/MFA e HMAC. Essa cópia segregada deve ser feita pelo proprietário em ambiente
seguro; não pedir os valores por chat. O backup testado aqui é integral do banco
HML e seus anexos, não uma certificação de recuperação integral da infraestrutura.

Procedimento versionado: `backup-integral-consulta-hml.sql`,
`restaurar-backup-integral-hml.py`, `cifrar-backup-hml.py`.
Para recuperar: conferir hash, descriptografar com a chave privada correspondente,
restaurar em banco isolado novo, conferir as 34 tabelas e sequências, configurar
os segredos conservados, testar autenticação/consulta privada e somente então
planejar troca autorizada. Não sobrescrever produção como parte do ensaio.

Os oito registros originais sem modelo permanecem com assinatura agregada
`0b75d6b1d058ed842cd8256cfb4bb318`, igual antes/depois desta rodada.

## Acessos legados e plano de produção — não executado

O rascunho existente `sql/rascunhos/bloquear-rpcs-legadas.sql` contém contenção de:

- `public.consulta_publica_protocolo(text)`;
- `public.consulta_publica_historico_protocolo(text)`;
- `public.consulta_publica_respostas_protocolo(text)`.

Antes de aplicar em produção: autorização expressa, backup próprio da produção
com restauração validada, API privada e papel restrito prontos, clientes
compatíveis, recuperação testada e conferência das permissões administrativas.
O script verifica autorização e existência do papel antes de revogar EXECUTE
público/anon/authenticated. Na reversão, manter protocolo e chave; se necessário,
suspender consulta privada, sem reabrir consulta por protocolo isolado.
A produção não foi alterada e seus acessos antigos não são considerados corrigidos.

## Pronto para aceite e pendências

Pronto para aceite: web HML com múltiplos anexos, mapa manual, coordenadas exatas,
fotos privadas ampliadas, sincronização e status, segurança e banco restaurável.

Pendentes: GPS e permissões reais no Android; câmera/galeria múltipla e zoom no
aparelho; atualização Android com assinatura compatível e abertura externa do
mapa; cópia segregada dos segredos do host; autorização futura e plano de migração
com contenção dos acessos legados e backup próprio de produção.
Nenhuma declaração de 100% ou autorização de migração é implícita neste relatório.

## Links

- V2: https://mandato-neon-homologacao.onrender.com/hml/v2/index.html
- Cadastro com fotos/mapa: https://mandato-neon-homologacao.onrender.com/hml/v2/solicitar
- Painel: https://mandato-neon-homologacao.onrender.com/hml/painel/recuperacoes
- API CI: https://github.com/wagnertomaszewski-boop/cartao-wagner-/actions/runs/42818675522
- Android CI: https://github.com/wagnertomaszewski-boop/cartao-wagner-/actions/runs/42818675508

Fontes técnicas consultadas: Leaflet 1.9.4 (`https://leafletjs.com/reference-1.9.4.html`),
política de tiles OSM (`https://operations.osmfoundation.org/policies/tiles/`),
formato APK v2 (`https://source.android.com/docs/security/features/apksigning/v2`).
