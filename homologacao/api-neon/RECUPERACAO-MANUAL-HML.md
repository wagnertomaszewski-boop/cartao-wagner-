# Recuperação manual — homologação

Escopo exclusivo: branch Git `feature/recuperacao-whatsapp-manual`, Render `mandato-neon-homologacao`, Neon `proud-firefly-64745516` / `br-lively-snow-bev5ecau`, schema `auth_admin_hml`. Nenhum acesso a solicitações reais ou ao Supabase. Os aplicativos V2/Painel publicados não foram modificados.

## Uso

- `/hml/`: login administrativo e TOTP. Aprovação, rejeição, emissão e abertura exigem sessão com MFA confirmado nos últimos cinco minutos.
- `/hml/painel-recuperacao`: criar fixture, listar pedidos com protocolo/telefone/situação, decidir com justificativa e conferir o telefone.
- `/hml/recuperar`: cidadão solicita com protocolo e telefone cadastrado e mantém a página aberta. O recibo privado permanece somente na memória dessa aba. A confirmação correta retorna uma nova chave e invalida a anterior em uma transação.

A emissão gera seis dígitos criptograficamente aleatórios por cinco minutos. O banco recebe somente HMAC vinculado ao desafio (segredo independente do servidor), nunca o código em texto puro. Cinco erros bloqueiam o pedido; o máximo é de três emissões, espaçadas por pelo menos um minuto. A reemissão substitui o código anterior. Há limite de três pedidos por solicitação/hora e limite HTTP por rota/minuto. Sucesso invalida recuperações paralelas da mesma solicitação. A validação usa locks PostgreSQL; duas validações concorrentes do mesmo código produzem apenas um sucesso.

Para aprovar é obrigatório declarar a conferência independente da identidade, justificar e redigitar o telefone cadastrado. Isso registra a conferência humana; não substitui a comprovação feita pelo administrador. A rejeição não exige divulgar ou confirmar o telefone e nunca libera código.

O destino não é fornecido livremente pelo navegador. O servidor usa o telefone cadastrado e somente permite abrir o WhatsApp se corresponder a `WHATSAPP_HML_DESTINO_TESTE`, previamente autorizado. Sem essa configuração, as fixtures usam um número fictício e o botão de abertura fica bloqueado. Não cadastrar números de terceiros ou enviar para o número fictício.

A mensagem/código aparecem uma única vez na emissão administrativa, em resposta `no-store`. A interface limpa a mensagem na expiração, saída, troca de pedido ou solicitação de abertura. Não há armazenamento local, analytics, códigos em links públicos ou parâmetros GET do serviço. A URI efêmera `whatsapp://send` abre o app instalado; o operador precisa confirmar o contato e tocar em Enviar no WhatsApp. A auditoria registra apenas abertura solicitada, sem afirmar envio/entrega. A integração não usa token, template, webhook nem WhatsApp Cloud API.

## API de homologação

POST JSON, origem exata do serviço e respostas sem cache. Nenhuma rota aceita código pela URL.

| Rota em `/hml/manual` | Acesso | Uso |
| --- | --- | --- |
| `POST /solicitar` | Cidadão | Protocolo + telefone; resposta neutra com pedidoId/recibo |
| `POST /validar` | Cidadão | pedidoId + recibo + código; sucesso retorna protocolo/novaChave |
| `GET /pedidos` | Admin + MFA recente | Lista privada com telefone cadastrado e situação |
| `POST /fixture` | Admin + MFA recente | Cria somente solicitação fictícia |
| `POST /pedidos/:id/decidir` | Admin + MFA recente | Aprovar/rejeitar, justificativa; aprovação exige conferência |
| `POST /pedidos/:id/emitir` | Mesmo aprovador + MFA recente | Gera código e mensagem; redigitação do telefone |
| `POST /pedidos/:id/abrir` | Mesmo aprovador + MFA recente | Confere desafio vigente/destino autorizado; registra intenção |

A justificativa fica no pedido privado, junto com autor e data da decisão; códigos e chaves não fazem parte da auditoria. A tabela de auditoria existente permanece sem privilégios de UPDATE/DELETE para o serviço.

## Migração e validação

`sql/recuperacao-manual-hml.sql` é aditiva, testada em PGlite e aplicada somente à branch Neon de homologação. O serviço mantém a role restrita `mandato_auth_hml`; grants novos limitados à tabela de recuperações.

- `npm test`: regressão geral e cenários negativos/positivos do módulo manual.
- `npm run test:hml`: senha/TOTP reais da biblioteca, HTTP, cookies, CSRF, bloqueio de MFA vencido e recuperação completa em PostgreSQL WASM.
- `HML_AUTOTESTE_MANUAL=sim`: executa no Render uma fixture fictícia no Neon real, verifica consumo concorrente, substituição da chave, rejeição e auditoria, sem envio de WhatsApp. O evento `manual_autoteste_v1_concluido` impede repetição após sucesso. O número autorizado configurado é ignorado por esse autoteste: nunca há mensagem externa.

## Limites de disponibilização

Estas telas são a implementação isolada de homologação dos fluxos cidadão e administrativo. Ainda é necessário validar o toque no WhatsApp/WhatsApp Business instalado com um telefone expressamente autorizado e a sessão administrativa real com TOTP do usuário. O navegador remoto pode não ter o aplicativo de mensagens instalado.

A adaptação visual/contrato para os aplicativos V2/Painel publicados e a migração de solicitações reais são uma etapa separada, exigem autorização própria e não são realizadas neste escopo. Nenhuma porcentagem de conclusão ou envio real é inferida dos testes automatizados.
