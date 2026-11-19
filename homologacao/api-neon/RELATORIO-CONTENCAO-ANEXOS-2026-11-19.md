# Mandato em Ação | Revisão para autorização de produção

19/11/2026. Base GitHub: `e4ccbd9 → 653cedb → 34c4067`. Render ativo na abertura da revisão: homologação em `34c4067`, produção em `e4ccbd9`. Produção consultada somente por catálogo e metadados do deploy.

## Exposição e consumidores

| RPC em public | Dados previstos no retorno | Dependências encontradas |
| --- | --- | --- |
| consulta_publica_protocolo(text) | Assunto, descrição, localidade, status e identificação do solicitante | Acompanhamento legado, V2 e versões arquivadas |
| consultar_protocolo(text) | Protocolo, assunto, descrição, localidade e status | Função alternativa acessível pelo mesmo perfil anônimo. Nenhum consumidor HTML nominal encontrado nesta revisão |
| consulta_publica_historico_protocolo(text) | Status e data | V2, snapshots e cópia empacotada |
| consulta_publica_respostas_protocolo(text) | Mensagem, referências de anexos e data | Acompanhamento legado e V2 |

As quatro funções são SECURITY DEFINER e o catálogo confirmou EXECUTE efetivo para anon e authenticated. A RLS das tabelas principais restringe leitura direta, mas não garante a filtragem dentro dessas funções. Nenhum protocolo ou arquivo de cidadão foi consultado. A busca por definições no catálogo não encontrou view pública para essas tabelas. Também encontrou funções de escrita de cadastro e avaliação e o gatilho de histórico. Elas não fazem parte desta mudança. A busca por referências no catálogo e no Git não confirma o código efetivamente instalado nos celulares.

Consumidores encontrados na árvore Git: `acompanhar.html`, `v2/index.html`, `v2/app-v2-1422.html`, `v2/app-v2-1708.html`, `v2/app-v2-1718.html`, `teste-conexao.html` e a cópia empacotada de `v2/index.html` em homologação. No host de homologação a cópia encaminha a consulta para a tela que exige chave. A consulta dedicada `v2/acompanhar.html` já dispensa essas RPCs na base revisada.

O Painel usa a sessão administrativa para leitura e envio. O Painel principal e HTMLs administrativos legados gravam ou renderizam referências de documentos que podem depender de URLs públicas. A candidata já transforma as referências no Painel ativo em abertura autenticada e deixa de gravar URLs públicas. As versões instaladas e o conteúdo empacotado no APK cidadão não foram inventariados dispositivo a dispositivo. WebViews com URL remota podem receber as telas atualizadas pelo mesmo endereço. APKs com HTML local, versões em cache ou endereços antigos precisam de verificação e podem exigir atualização obrigatória.

## Anexos e ensaio isolado

O catálogo confirmou `documentos-respostas` público. As políticas SELECT atuais do Storage revisadas não conferem leitura direta desse bucket a usuários comuns. Privatizar bloqueia o caminho público, mas o Painel precisa de política administrativa de leitura e de cliente compatível.

O script de contenção mantém os objetos e referências. Ele reaproveita a condição administrativa existente e acrescenta uma política restritiva aplicada apenas aos documentos de respostas. O ensaio usa registros fictícios e verifica bloqueio para anon e outro usuário autenticado, acesso do administrador e continuidade do bucket público de divulgação. O transporte candidato solicita downloads pela rota autenticada, com credencial no servidor e sem redirecionamento. A API só localiza o arquivo depois de verificar protocolo, chave e vínculo com a solicitação. Referências antigas válidas podem ser convertidas em identificadores privados sem mudar o objeto. A consulta e o download usam a chave emitida para a solicitação como credencial de posse. A recuperação valida a identidade na etapa administrativa antes da emissão do código.

Ainda é necessário validar o gateway real de Storage na janela autorizada usando objeto fictício. Verificar URL pública antiga e direta, cache/CDN, download autenticado, emissão de URL assinada (se aplicável), usuário incorreto, chave revogada e acesso simultâneo pelo Painel. Cópias previamente baixadas e respostas já cacheadas não são revogadas pela RLS.

## Compatibilidade da chave e requisitos para liberação

O banco real usa `chaves_acompanhamento.segredo_verificador`, `pedidos_recuperacao`, `codigos_recuperacao` e `auditoria_recuperacao`. A candidata passou a usar o mesmo HMAC v1 do cadastro existente para consultar, emitir e renovar chaves. A credencial desse cálculo vem de `PRODUCAO_HMAC_SECRET`, separada da usada para as operações internas da candidata. O código recusa versão desconhecida e chave revogada.

O ensaio aplica o esquema privado anterior sobre dados sintéticos, usa as tabelas existentes de recuperação e acrescenta apenas o campo de recibo nesses pedidos e testa uma chave HMAC v1. O script de contenção continua abortando antes de alterar permissões se o contrato esperado estiver ausente. A contagem agregada da tabela de chaves de produção retornou zero registros na verificação de 19/11/2026. Isso não elimina a necessidade de validar a recuperação para protocolos antigos que ainda não têm chave.

A compatibilidade testada dispensa regravar o verificador v1. Ainda é necessário aprovar e validar as estruturas aditivas da candidata, a disponibilidade do segredo existente no backend escolhido, a emissão autorizada para solicitações antigas e os downloads no gateway real. A API usa as tabelas existentes de pedidos, códigos e auditoria. Pedidos anteriores sem o verificador do recibo são preservados e precisam de novo pedido no fluxo protegido.

## Implantação e autorização solicitada por operação

1. Autorizar inventário dos canais e dispositivos com versões publicadas, backup restrito de banco e Storage e ensaio de restauração. Acompanhar contagem de registros e objetos sem transportar dados reais para homologação.
2. Autorizar a migração aditiva das tabelas e permissões do backend privado candidato, após revisar o SQL e inventariar eventuais pedidos e códigos pendentes. Validar a leitura, versões de chave e preservação de protocolos com fixture sintética.
3. Autorizar a publicação da API privada candidata revisada, do Painel protegido e da versão de acompanhamento dos clientes. Validar em piloto MFA, auditoria, solicitação nova e legada, recuperação e download associado à chave.
4. Autorizar a execução transacional da revogação de EXECUTE das quatro assinaturas legadas para PUBLIC, anon e authenticated. Conferir privilégios efetivos e leitores administrativos após a operação.
5. Autorizar separadamente a alteração de RLS de leitura e a privatização do bucket `documentos-respostas`, seguida da checagem das URLs antigas e dos clientes. Manter os buckets de divulgação públicos.
6. Autorizar, se necessária, a atualização obrigatória dos aplicativos ou a página de manutenção para versões incompatíveis. Validar as telas distribuídas no celular e o cache do WebView. A abertura pública de novos cadastros exige uma decisão própria.

Contingência: se a troca não puder ocorrer sem exposição, suspender o acompanhamento e os downloads afetados, manter gestão autenticada disponível e reverter apenas para versões com segurança equivalente. Não reabrir RPCs públicas, tornar o bucket público, restaurar chaves revogadas ou sobrescrever dados novos com backups antigos. Em caso de urgência, a contenção pode ser autorizada antes da troca de clientes, com manutenção temporária e impacto explícito para usuários antigos.
