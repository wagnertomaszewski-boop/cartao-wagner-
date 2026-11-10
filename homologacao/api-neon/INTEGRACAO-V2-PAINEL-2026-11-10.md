# Integração V2 e Painel — evidências de homologação

Registro de 10/11/2026, horário de Brasília. Preserva a biometria do Painel,
confirmada pelo proprietário em aparelho físico. Não houve alteração de código
Android, assinatura, aplicativo publicado, Play Store ou banco de produção.

## Código e serviços

- Repositório `wagnertomaszewski-boop/cartao-wagner-`.
- Branch exclusiva `feature/recuperacao-whatsapp-manual`.
- `4ea2f3c980cb2b0200ab3244aca85a9f8c0433ec`: carregamento inicial do catálogo,
  atualização periódica visível e consulta privada sem persistência local.
- `40aaabb6300cc535e6cda2c2fa02375ca1d8388f`: reenvio idempotente de cadastro,
  proteção de resposta tardia e limpeza da nova chave após usar o acompanhamento.
- Render `mandato-neon-homologacao`, serviço `srv-dbno75c9v7es73daf170`.
  Deploy `dep-dbpg4n29lscs73b81ung`, **live**, commit `40aaabb`, concluído
  em 10/11/2026 às 08:39:46 (Brasília).
- Neon `proud-firefly-64745516`, branch `br-lively-snow-bev5ecau`, banco `neondb`,
  schema privado `auth_admin_hml`, papel restrito `mandato_auth_hml`.
- V2, Mandato e Painel de homologação utilizam esse mesmo backend. Supabase
  de produção permaneceu sem alterações; esta verificação não certifica seus
  acessos legados como seguros.

## Correções efetivas

O Painel passou a carregar o catálogo ao entrar com MFA. A atualização periódica
ocorre a cada 30 segundos apenas em tela visível e sem formulário em edição ou
código selecionado. A gestão aberta não é substituída pelo catálogo. A V2 ganhou
“Atualizar andamento” e atualização periódica
com protocolo e chave revalidados pelo servidor. Sessão sem MFA não libera dados.
Ao sair da página, respostas privadas atrasadas são descartadas e os dados são
limpos. A alternativa manual e as pontes nativas existentes foram preservadas.

O reenvio do cadastro usa identificador aleatório por formulário. A restrição
única e a transação no PostgreSQL impedem dois cadastros da mesma operação.
O identificador e os dados da operação são persistidos somente como HMAC.
A chave inicial reproduzível usa HMAC com domínio separado e segredo do servidor;
não é guardada em texto puro. Reenvio com conteúdo alterado ou depois da rotação
da chave recebe 409, sem criar registro e sem recuperar uma chave revogada.

A migração aditiva adicionou duas colunas opcionais e um índice único no schema
de homologação; não reescreveu históricos. Os oito registros originais sem modelo
mantiveram a assinatura MD5 agregada `0b75d6b1d058ed842cd8256cfb4bb318` antes/depois
(agregação de id, protocolo e hash da chave ordenados por id). Esta assinatura
usa fórmula distinta dos checkpoints antigos e não deve ser comparada a eles.

Os estados administrativos Encaminhado, Em análise, Em andamento e Concluído
foram preservados. O estado inicial/legado Recebida não foi renomeado, preservando
sua compatibilidade histórica.

## Evidências reais pelas interfaces

1. `2026-900014`: cadastro pela V2, geração de chave de acompanhamento de 43
   caracteres, recebimento no Painel, mudança para Em andamento, retorno à V2
   com dois movimentos datados. Login completo e MFA realizados de forma segura.
2. No mesmo caso: recuperação solicitada pela V2; aprovação administrativa com
   justificativa e identidade fictícia conferida; emissão de código de seis
   dígitos; código incorreto recusado; código correto validado; chave permanente
   renovada e anterior recusada. Auditoria confirmou solicitação, aprovação,
   emissão, recusa, validação e rotação. Código temporário não se tornou chave.
3. `2026-900015`: cadastro pela V2 após a correção de reenvio, com PNG fictício
   privado (68 bytes). Consulta autorizada exibiu histórico e anexo. Download
   pela interface comparado byte a byte ao original: íntegro. QR gerado pela
   interface; contrato exige chave, URL do QR contém somente o protocolo.
4. Chave de `2026-900015` combinada com protocolo `2026-900014`: interface recusou,
   sem exibir os dados. Campo da chave obrigatório. Teste HTTP confirmou também
   recusa do protocolo existente sem chave no servidor.
5. `2026-900015`: nova aprovação real com MFA e emissão às 08:46:02, validade
   até 08:51:03. Tentativa real às 08:51:25 (322 segundos depois da emissão):
   recusada pela interface, sem chave nova, com evento `manual_codigo_expirado`
   e `codigo_hash IS NULL` confirmados no Neon. Não houve alteração do relógio
   nem antecipação da expiração no banco.
6. Destino fictício: botão WhatsApp corretamente bloqueado. Nenhuma mensagem
   foi enviada para telefone fictício. Os testes pessoais autorizados anteriores
   permanecem evidência histórica; não foram contados novamente. A auditoria
   anterior contém duas aberturas solicitadas, sem confirmação de entrega.
7. Tentativa de nova emissão após vencer o MFA: interface recusou com
   “Entre e confirme novamente o MFA para esta operação”, sem exibir código.
8. Login biométrico do Painel: confirmado pelo proprietário em Android; código
   preservado. Não foi simulado no navegador nem declarado novo teste físico.

## Testes automatizados e HTTP real

| Execução | Aprovados | Falhas | Ignorados | Observação |
|---|---:|---:|---:|---|
| CI principal `40aaabb`, run 42809209056 | 479 | 0 | 2 | 481 casos; inclui os novos testes |
| Rodada local afetada (modelo, reenvio, telas, HTTP/MFA) | 15 | 0 | 0 | Subconjunto; não somar ao CI |
| Ciclo de atualização visível, rodada anterior | 4 | 0 | 0 | Também incluído no CI |
| Guarda de privacidade da ponte cidadã | 5 | 0 | 0 | Preservada; sem teste físico novo |
| Ensaio HTTP concorrente no Render/Neon | 1 cenário | 0 finais | 0 | Duas requisições, um cadastro |

Os outros três workflows do mesmo commit concluíram com sucesso. Há sobreposição
entre suítes e verificações; não há soma como total de testes únicos.
Os dois ignorados são integrações antigas com fixture/configuração externa
(`integracao-neon-real.test.mjs`, `integracao-http-neon-real.test.mjs`), não aceites.

O primeiro ensaio HTTP adicional foi recusado por ausência de Origin (403).
Corrigido o cliente de teste para enviar a origem autorizada, o cenário passou;
nenhuma proteção foi removida. Origem indevida continuou recusada com 403.
Duas requisições concorrentes geraram apenas `2026-900016`, com o mesmo protocolo
e chave. Dados alterados no reenvio: 409. Consulta com chave: aceita; sem chave:
recusada. Banco confirmou uma única linha para esse cenário.

## Auditoria e segurança

Auditoria consultada no Neon exclusivamente na branch de homologação, sem ler
códigos/chaves/números pessoais. Eventos foram associados à recuperação por
`recuperacoes_manuais.id`, e desta à solicitação por `solicitacao_id`.
Os testes anteriores incluem rejeição, reutilização recusada e expiração.
A tentativa inválida não liberou nenhum dado privado. O código é HMAC no banco, tem validade de cinco minutos, máximo de tentativas,
limite de emissões e bloqueio de solicitações repetidas. A validação bem-sucedida
consome o código, troca a chave permanente e invalida outras recuperações abertas.
Abertura de WhatsApp não é recibo de envio nem de entrega.
A página principal aprovada da V2 foi aberta e seu botão “Acompanhar protocolo”
levou à mesma tela protegida. A identidade visual e as fotografias foram mantidas.

## Pendências e autorização para produção

- A rodada atual não repetiu o envio pessoal no WhatsApp; exige aplicativo no
  aparelho e confirmação humana do destinatário/envio. Não há entrega automática.
- Conferência final das telas em celular e dos fluxos de câmera/localização na
  versão instalada: depende do aparelho. A aprovação física informada cobre a
  biometria, não equivale ao aceite de todos os fluxos desta rodada.
- Backup integral independente, incluindo auth e anexos de produção, com ensaio
  de restauração integral, ainda necessário. Restaurações isoladas de fixtures
  já testadas não substituem esse requisito.
- Conter RPCs legadas de consulta apenas por protocolo em produção, compatibilizar
  os clientes publicados e validar migração gradual. Rascunho já preparado;
  aplicação em produção depende de autorização expressa.
- Migrar adaptador de solicitações antigas com reconciliação e verificação de
  histórico; não foi feita importação de dados reais nesta execução.
- Reversão deve manter exigência de protocolo e chave, interrompendo acesso
  privado em caso de falha em vez de reabrir consulta por protocolo isolado.
- Autorizar separadamente implantação definitiva e atualizações dos aplicativos.

Prontidão: fluxo principal comprovado em homologação; não é liberação para
produção nem declaração de 100%. Nenhuma migração de produção foi executada.

## Endereços de homologação

- V2: https://mandato-neon-homologacao.onrender.com/hml/v2/index.html
- Cadastro: https://mandato-neon-homologacao.onrender.com/hml/v2/solicitar
- Acompanhamento: https://mandato-neon-homologacao.onrender.com/hml/v2/recuperar
- Painel: https://mandato-neon-homologacao.onrender.com/hml/painel/recuperacoes

## Arquivos modificados

Os commits funcionais modificam as fontes `painel/seguranca/recuperacoes.mjs`,
`v2/recuperar-acesso.html`, `v2/seguranca/tela-cadastro-hml.mjs`,
`v2/seguranca/tela-recuperacao-manual.mjs`; acrescentam
`v2/seguranca/atualizacao-visivel.mjs`.
No backend: `solicitacoes-modelo-hml.mjs`, `sql/solicitacoes-modelo-hml.sql`,
`servidor-auth-hml.mjs`, `preparar-telas-hml.mjs`, testes
`atualizacao-visivel.test.mjs`, `cadastro-idempotente-hml.test.mjs` e
`tests-hml/http-auth.test.mjs`, além das cópias empacotadas e seu manifesto.
