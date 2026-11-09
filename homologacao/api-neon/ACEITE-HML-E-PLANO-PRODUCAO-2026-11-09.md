# Verificação consolidada de homologação e plano de produção

Verificado em 09/11/2026, aproximadamente 03:57 UTC. Somente a branch
`feature/recuperacao-whatsapp-manual`, Render `mandato-neon-homologacao` e Neon
`proud-firefly-64745516`, branch `br-lively-snow-bev5ecau`, banco `neondb`.
Não constitui autorização de produção.

## Versão e implantação verificadas

- Commit executável verificado: `c6e041337f36d4321fc0d5c0e4b80a1ab6baad92`.
- Render: deploy `dep-dbok3mlg1s2s738knc9g`, estado `live`, concluído às
  03:46:19 UTC. Serviço limitado à homologação.
- `/health`: HTTP 200, `modo=homologacao`, rotas cidadãs legadas desabilitadas,
  consulta privada habilitada.
- `/hml/api/estado`: HTTP 200, recuperação manual versão 3, marcadores reais
  Neon, destino autorizado e telas validados; API automática WhatsApp desabilitada.
- Telas definitivas do fluxo disponíveis em `/hml/v2/recuperar` e
  `/hml/painel/recuperacoes`. Arquivos empacotados são cópias verificadas por hash
  das telas da branch. Isto não significa atualização dos aplicativos publicados.

## Testes executados nesta rodada

| Execução | Aprovados | Falhas | Ignorados |
| --- | ---: | ---: | ---: |
| `npm test`, em `homologacao/api-neon` | 445 | 0 | 2 |
| `npm run test:hml`, no mesmo diretório | 6 | 0 | 0 |
| `node --test v2/seguranca/*.test.mjs painel/tests/*.test.cjs` | 29 | 0 | 0 |

Não somar estas linhas como testes únicos: a suíte HTTP repete testes de
autenticação presentes na suíte principal. As duas exclusões são integrações
legadas externas (`HTTP -> Node pg -> Neon real` e `Neon real: RPC...`) que
dependem de configuração/fixture própria; não foram apresentadas como aprovação.
O novo fluxo tem evidência independente de execução real no Render/Neon e
integração HTTP local com PostgreSQL WASM, login e TOTP reais.

O script `node smoke-manual-render.mjs` passou contra o serviço público:
marcadores Neon, páginas HTTP 200/no-store, módulos com MIME JavaScript,
redirecionamento canônico, lista e criação administrativas HTTP 401 sem sessão,
origem externa HTTP 403, rota administrativa legada HTTP 410 e resposta neutra
para recuperação sem correspondência. Nenhuma mensagem externa foi enviada.

Consulta adicional HTTP com protocolo **existente e fictício**, selecionado
somente de fixture sem autorização pessoal: chave ausente, errada e curta
retornaram HTTP 200 e `encontrado=false`. Nenhum telefone ou segredo foi lido.
O autoteste persistido v1 também comprova chave anterior revogada e nova chave
válida; o v3 comprova concorrência entre pedidos da mesma solicitação.

Os quatro workflows do commit verificado estão concluídos com sucesso:

- [Testes HTTP locais sem segredos](https://github.com/wagnertomaszewski-boop/cartao-wagner-/actions/runs/42558125237)
- [Homologacao API Neon - testes](https://github.com/wagnertomaszewski-boop/cartao-wagner-/actions/runs/42558125138)
- [Homologacao HTTP Neon isolada](https://github.com/wagnertomaszewski-boop/cartao-wagner-/actions/runs/42558125105)
- [Testes de segurança das chaves](https://github.com/wagnertomaszewski-boop/cartao-wagner-/actions/runs/42558125119)

## Auditoria real, consultada somente em leitura

Contagens são acumuladas da homologação, incluindo autotestes; não são novos
envios nem quantidade de cidadãos. Não foram consultados números pessoais,
chaves ou códigos.

| Evento | Registros |
| --- | ---: |
| `mfa_totp_confirmado` | 10 |
| `manual_aprovacao` | 8 |
| `manual_rejeicao` | 1 |
| `manual_codigo_gerado` | 8 |
| `manual_abertura_whatsapp_solicitada` | 2 |
| `manual_codigo_validado` | 5 |
| `manual_codigo_reuso_bloqueado` | 3 |
| `manual_codigo_expirado` | 1 |
| `manual_recuperacao_concluida` | 5 |

Há um marcador concluído de cada autoteste real v1, v2 e v3. Todos os cinco
registros consumidos estão sem `codigo_hash`. Não existe coluna `codigo` em
`recuperacoes_manuais`; a implementação persiste HMAC, nunca o código puro.
O papel `mandato_auth_hml` pode inserir auditoria e não pode alterá-la ou apagá-la.

Emissões históricas medem entre 299,999 e 300 segundos. A diferença antiga de
1 ms já foi corrigida com uma única referência de relógio. O teste de limite
exato e o autoteste real v3 confirmam 300 segundos na versão atual.

Os testes cobrem MFA recente vinculado à sessão, rejeição sem emissão,
conferência de telefone/identidade, destino autorizado, limitação de tentativas,
expiração, uso único e invalidação de recuperações concorrentes. A abertura do
WhatsApp é intenção de envio, **não comprovação de entrega**. Os testes pessoais
já executados e seus eventos foram preservados; não foi solicitado novo envio.

## Correções e limites desta rodada

Nenhuma falha funcional nova foi encontrada. Foi corrigida uma ambiguidade no
procedimento de reversão: restaurar uma rota antiga só é permitido se ela
continuar exigindo chave. Reversão nunca pode reabrir consulta por protocolo
sozinho ou reativar chave revogada. Não houve alteração funcional de API/telas
nesta rodada, portanto não foi repetida a suíte após edição de documentação.

Uma tentativa auxiliar de leitura HTTP por `curl` teve falha no analisador de
cabeçalhos do proxy de execução; não foi falha da aplicação. O script oficial
passou e as três negativas com protocolo existente foram confirmadas depois
por leitura direta do corpo/status. Nenhum resultado dessa tentativa foi contado
como teste funcional aprovado.

O resultado vale para o fluxo de recuperação e consulta homologado. Não
equivale a teste de instalação Android/Play Store, teste completo de todas as
funcionalidades dos três aplicativos ou proteção já ativada em produção.

## Plano seguro de migração — preparado, não executado

### 1. Fixar candidato e inventariar dependências

Responsável técnico registra commit, hashes de artefatos, configuração sem
segredos e domínios de V2, Mandato em Ação, Painel e API. Após autorização para
essa fase, inventariar somente em leitura tabelas, RLS, funções RPC, permissões,
Storage/anexos, clientes antigos e service workers de produção. Usar o banco
atual como fonte oficial até reconciliação e aceite. Não presumir que fixtures
`auth_admin_hml.pedidos` sejam o modelo real dos cidadãos.

Decisão antes da implementação de produção: manter o banco Supabase existente
com uma API privada ou realizar migração de dados para Neon. Recomenda-se separar
a implantação da recuperação de uma eventual mudança de banco, reduzindo o
escopo de cada liberação. Nenhuma dessas alternativas foi executada.

### 2. Preparar serviço e migrações próprios de produção

Criar adaptador para solicitações reais e serviço próprio, com domínios
permitidos, papel de privilégio mínimo, segredos novos, autenticação
administrativa e MFA recente no servidor. Não adaptar o serviço de homologação
desativando suas restrições de host/ambiente. Não copiar credenciais, sessões,
TOTP, números autorizados ou fixtures de homologação.

Preparar SQL versionado, aditivo, idempotente, transacional quando aplicável,
com pré/pós-condições de integridade e privilégios. Modelar chave aleatória
forte, hash persistido, OTP HMAC, consumo/rotação atômicos e auditoria restrita.
Não derivar chave do protocolo. A emissão para solicitações antigas depende de
conferência de identidade e contato previamente autorizado; nenhuma emissão em
massa, exportação de segredo ou mensagem automática é prevista.

### 3. Backup, restauração e ensaio isolado

Antes de qualquer alteração real: verificar backup consistente de banco e
arquivos privados, ensaiar restauração e medir RPO/RTO. Ensaiar migração,
reexecução e reversão em ambiente isolado com dados sintéticos representativos.
Não copiar cidadãos para o banco atual de testes. Comparar contagens,
relacionamentos e acesso aos anexos; não aceitar apenas igualdade de totais.

### 4. Bloquear caminhos antigos antes da exposição pública

Inventariar e remover a capacidade de consulta anônima somente com protocolo
das RPCs `consulta_publica_protocolo`, `consulta_publica_historico_protocolo` e
`consulta_publica_respostas_protocolo`, além de qualquer equivalente identificado.
Revisar grants/RLS e dependências administrativas antes de preparar a revogação.
Proteger também anexos e URLs antigas. A existência de telas novas não bloqueia
chamadas diretas às RPCs antigas.

Tratar PWA em cache, service worker e aplicativos antigos: exigir atualização ou
oferecer recuperação segura, sem fallback por protocolo. Testar abertura de nova
solicitação e entrega privada inicial da chave; o fluxo atual de homologação
usa solicitações fictícias, não migra esse cadastro de produção.

### 5. Critérios objetivos de liberação

Bloqueiam produção: acesso a solicitação/anexo sem chave; chave de outro cidadão
aceita; aprovação/emissão sem MFA recente; OTP rejeitado liberado; reutilização
ou expiração aceitas; auditoria ausente ou alterável pelo papel da API; backup
sem restauração comprovada; chaves antigas recuperadas sem conferência; cliente
antigo com acesso público por protocolo; inconsistência de dados/anexos.

Exigir testes integrados do adaptador real, perfis administrativos, MFA expirado,
CSRF, limites, destino incorreto, concorrência, código incorreto/expirado/usado,
revogação da chave anterior, novo cadastro e atualização dos clientes. Validar
um piloto autorizado com solicitação de teste e envio manual confirmado pelo
operador. Não registrar OTP em logs, auditoria ou URLs internas. O link externo
do WhatsApp contém a mensagem por necessidade do envio manual e não deve ser
registrado/compartilhado como evidência.

### 6. Ativação e reversão após autorização específica

Apresentar ao usuário o commit candidato, SQL, serviço, janela, evidências de
backup/restauração, impacto nos clientes antigos, responsáveis e reversão.
Somente com autorização explícita executar implantação, bloquear RPCs antigas
e habilitar piloto. Monitorar erros, latência, tentativas recusadas e auditoria;
expandir apenas com os critérios cumpridos. Publicação Play Store é uma
autorização separada.

Em falha: interromper expansão e recuperação afetada, preservar auditoria e
escritas válidas. Manter consulta segura quando possível. Nunca restaurar acesso
por protocolo, chaves revogadas ou backup por cima de novas solicitações.
Preferir desativação de recurso e correção posterior a exclusão urgente de
schema. Qualquer reconciliação/restauração real requer plano revisado e aceite.

## Pendências reais para cidadãos

1. Adaptador/serviço e migrações de produção ainda não implementados e ensaiados.
2. Inventário e bloqueio das RPCs, anexos e clientes antigos de produção pendentes.
3. Estratégia para chaves de solicitações existentes e chave inicial de novas
   solicitações deve ser implementada no cadastro real e validada.
4. Backup/restauração, piloto e autorização de produção pendentes.
5. Atualização/distribuição dos aplicativos e eventual Play Store não executadas.
6. Dois testes legados externos continuam ignorados; a evidência real do fluxo
   atual não deve ser confundida com a aprovação dessas integrações legadas.

Nenhum percentual global ou prontidão de produção é inferido da quantidade de
testes. O fluxo homologado passou nas verificações descritas; produção permanece
inalterada e depende das etapas acima.
