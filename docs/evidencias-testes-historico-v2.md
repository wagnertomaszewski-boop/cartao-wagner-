# Evidências de homologação — histórico seguro

Verificações realizadas em 2026-11-07 no projeto Neon isolado `proud-firefly-64745516`, esquema `mandato_testes`.

## Testes SQL executados
- `HIST-TESTE-900001` com chave fictícia A (64 caracteres): retornou somente `Evento fictício A`.
- `HIST-TESTE-900001` com chave fictícia B: zero registros.
- `HIST-TESTE-900002` com chave fictícia B: retornou somente `Evento fictício B`.
- `SET LOCAL ROLE mandato_cidadao_a` seguido de `SELECT` direto em `historico_status`: negado pelo PostgreSQL (`permission denied`).
- Consulta à função de histórico com chave inválida: zero registros.
- Consulta de privilégios: `mandato_cidadao_a` e `mandato_cidadao_b` podem executar `consulta_historico_segura`; `mandato_admin_teste` não pode.

## Limitações
- São dados fictícios e testes diretos no banco; não equivalem a teste completo de navegador, API HTTPS e autenticação administrativa.
- Não foram executados os testes Node atualizados diretamente da ramificação GitHub nesta etapa.
- A API HTTPS ainda não está publicada e a flag `SEGURANCA_V2_ATIVA` permanece desligada.
- A produção Supabase ainda expõe funções legadas de consulta por protocolo. **Não considerar a produção protegida**.

## Próxima etapa
Executar `node --test homologacao/api-neon/*.test.mjs v2/seguranca/*.test.mjs` em cópia integral da ramificação, corrigir eventuais falhas, implementar anexos com URLs temporárias e preparar plano de entrega de chaves antigas antes da ativação.

## Verificações adicionais — 2026-11-07
- Papel `mandato_cidadao_b` com protocolo fictício A e chave A: retornou apenas `Evento fictício A`.
- Mesmo papel com protocolo A e chave B: zero registros.
- Papel `mandato_cidadao_a` com protocolo inexistente e chave A: zero registros.
- Teste automatizado de operações atualizado para diferenciar consultas de detalhes, respostas e histórico. **Execução Node pendente**: o ambiente de execução não conseguiu acessar o repositório GitHub por DNS; não considerar esses testes aprovados até execução efetiva.

## Teste local adicional — 2026-11-07
- Executados **4 testes Node** em reconstrução local equivalente do adaptador `operacoes-neon.mjs`: detalhes/respostas/histórico com campos permitidos, rejeição de chave curta, bloqueio de consultas secundárias sem resultado autenticado e mensagem genérica de recuperação.
- Resultado: **4 aprovados, 0 falhas**.
- Ressalva: este teste foi feito em reconstrução local do adaptador, **não** na cópia integral e exata do repositório. A suíte oficial do GitHub continua pendente.
- Alteração de código na branch: respostas de detalhes agora passam por lista explícita `{assunto,status}`, impedindo vazamento acidental de campos extras retornados pelo banco.

## Metadados de anexos protegidos — 2026-11-07
- Criada no Neon isolado a função `consulta_nomes_anexos_segura(text,text)`, com `EXECUTE` retirado de `PUBLIC` e concedido aos papéis cidadãos de homologação.
- A função retorna somente `nome_arquivo`, jamais `caminho_privado`.
- Teste com anexo fictício `foto-ficticia-a.jpg`: protocolo A/chave A retornou o nome; protocolo A/chave B e protocolo B/chave B não retornaram o arquivo.
- Adaptador da API atualizado para retornar `anexos: [{nome_arquivo}]`; o executor permite apenas SQL parametrizado.
- **Não há endpoint de download**: arquivos privados não podem ser abertos ainda; requer autorização de servidor e URL temporária. Não confundir listagem de nomes com acesso ao conteúdo.
- Testes Node atualizados no GitHub, mas a suíte integral da branch continua pendente de execução.

## Restrição de observações internas — 2026-11-07
- No banco **Neon isolado**, a tabela `mandato_testes.historico_status` recebeu a coluna `visivel_cidadao boolean NOT NULL DEFAULT false`.
- A função `consulta_historico_segura` foi atualizada para exigir `h.visivel_cidadao IS TRUE`, além de protocolo e chave corretos.
- Dois eventos fictícios existentes foram explicitamente marcados como visíveis; um novo evento `NOTA INTERNA FICTÍCIA — NÃO EXIBIR` foi inserido com a visibilidade padrão privada.
- Teste com chave válida nos papéis `mandato_cidadao_a` e `mandato_cidadao_b`: apenas `Evento fictício A` foi retornado; a nota interna não apareceu.
- **Atenção à migração:** não marcar automaticamente históricos legados como públicos. Exigir revisão de cada classe de observação e distinguir atualizações públicas de anotações administrativas.

## Revogação de função antiga de anexos — 2026-11-07
- Auditoria encontrou `mandato_testes.consulta_anexos_segura(text,text)` retornando `caminho_privado` e com permissão de execução para ambos os papéis de cidadão de testes.
- Revogado `EXECUTE` dessa função para `mandato_cidadao_a` e `mandato_cidadao_b` **somente no Neon de homologação**.
- Consulta de privilégios confirmou `false` para ambos na função antiga e `true` na função nova `consulta_nomes_anexos_segura`.
- Criado teste de regressão do executor para recusar consulta à tabela `anexos` e chamada à função antiga que retornava caminhos.
- A suíte Node integral ainda está pendente; a alteração não foi aplicada ao Supabase de produção.

## Auditoria de privilégios diretos — 2026-11-07
- Confirmado RLS `ENABLE` e `FORCE` nas sete tabelas do esquema isolado.
- Detectadas permissões `SELECT` diretas nas tabelas `anexos` e `solicitacoes` para ambos os papéis de cidadão; revogadas no **Neon de homologação**.
- Nova consulta a `has_table_privilege` confirmou que ambos os papéis cidadãos agora têm `SELECT=false` em **todas as sete tabelas**.
- Regressão após revogação: os dois papéis continuaram consultando corretamente os nomes de anexos e o histórico público mediante protocolo e chave, via funções `SECURITY DEFINER`.
- Observação: papéis de homologação representam acesso ao endpoint protegido, não a identidade real de cada cidadão; o segredo do protocolo continua sendo o fator de autorização. Antes de produção, autenticação, emissão e recuperação de segredos precisam de validação de ponta a ponta.

## Recuperação WhatsApp: resposta não enumerável — 2026-11-07
- Inspecionada definição real de `mandato_testes.pedir_recuperacao`: exige correspondência de protocolo e WhatsApp normalizado, usa bloqueio transacional e impede pedidos simultâneos/novos pedidos dentro de 24h; sempre retorna `true`.
- Testes SQL executados com `mandato_cidadao_a` e `mandato_cidadao_b`: protocolo fictício existente com WhatsApp não cadastrado e protocolo inexistente retornaram igualmente `true`.
- Os dois protocolos fictícios de histórico não possuem contato de recuperação cadastrado. Portanto, esses testes **não demonstram** a criação de pedido válido, a prevenção de duplicidade na prática nem o fluxo de decisão; são testes apenas de resposta indistinguível.
- A função administrativa `decidir_recuperacao` pode rotacionar a chave, mas a rota administrativa de homologação continua desabilitada até validação real da identidade. **Não executar aprovação com dados reais ou ativar o endpoint antes dessa validação.**
- O banco Neon de testes não é a produção Supabase. A suíte Node e a API HTTPS pública continuam pendentes.

## Recuperação WhatsApp: criação e antirrepetição reais — 2026-11-07
- Cadastrado **somente no Neon de homologação** um WhatsApp fictício `51988887777` para solicitação fictícia `900001`; antes do teste não havia pedidos para essa solicitação.
- Com papel `mandato_cidadao_a`, chamadas com telefone formatado, telefone repetido e telefone errado retornaram `true` indistintamente.
- A tabela registrou **exatamente um** pedido com status `pendente` para `900001`, demonstrando normalização do telefone e bloqueio de duplicação enquanto pendente.
- Com papel `mandato_cidadao_b`, repetir a combinação válida e tentar protocolo `900002` com telefone de `900001` também retornou `true`. Após o teste, continuou existindo **um único pedido**, apenas para `900001`.
- Ainda não se verificou a janela de 24h após decisão nem a identidade real de quem pede recuperação. **Aprovação administrativa não foi executada**; rota permanece bloqueada sem confirmação de identidade no servidor.

## Revisão estática do teste HTTP integrado — 2026-11-07
- `homologacao/api-neon/integracao.test.mjs` estava desatualizado: utilizava chave curta rejeitada pela validação atual e esperava apenas uma consulta de banco no fluxo protegido.
- Atualizado para chave fictícia de 64 caracteres, quatro consultas parametrizadas de cidadão (principal, respostas, anexos, histórico) e uma decisão administrativa simulada, além do pedido inicial; seis chamadas no total.
- Conferido o conteúdo atualizado no GitHub. **Não foi executado o teste Node real**: o ambiente local não conseguiu resolver `github.com` para clonar a ramificação. O teste administrativo utiliza verificador de identidade simulado e não valida autorização real de produção.

## Bloqueio preventivo da criação sem identidade verificada — 2026-11-07
- Auditoria da definição real de `mandato_testes.criar_solicitacao_segura(uuid,text,text)` identificou que `p_cidadao_id` é aceito diretamente do chamador; a função é `SECURITY DEFINER` e não valida a identidade no servidor.
- Revogado `EXECUTE` para `mandato_cidadao_a` e `mandato_cidadao_b` **somente no Neon de homologação**, até a implementação de autenticação/atribuição confiável de identidade.
- Consulta posterior de `has_function_privilege` confirmou `false` para ambos os papéis.
- Esse bloqueio impede o uso desse fluxo de criação em homologação; as consultas protegidas e a recuperação permanecem separadas. Não há alteração no fluxo legado de criação em produção.
- Para reativar, criar uma operação servidor que derive a identidade de uma sessão verificada, não do corpo enviado pelo navegador; testar autorização e compatibilidade antes de conceder execução.

## Regressão da revogação de criação — 2026-11-07
- Teste SQL real com `SET LOCAL ROLE mandato_cidadao_a` e `mandato_cidadao_b`: chamada de `criar_solicitacao_segura` foi rejeitada com `SQLSTATE 42501 permission denied` em ambos os casos; nenhuma solicitação de teste foi criada por essas chamadas.
- Teste de compatibilidade: `consulta_segura` com protocolo/chave fictícios corretos retornou `Histórico teste A / recebido`; com chave incorreta retornou vazio.
- Acrescentado em `executores-postgres.test.mjs` um teste de regressão que exige a rejeição da função de criação tanto pelo executor cidadão quanto pelo administrador; o teste Node ainda aguarda execução.

## Auditoria de privilégios INSERT — 2026-11-07
- Verificados `INSERT`, `UPDATE` e `DELETE` para os dois papéis cidadãos nas sete tabelas do Neon isolado. Identificado `INSERT=true` nas tabelas `solicitacoes` e `anexos`.
- Revogado `INSERT` nessas duas tabelas para ambos os papéis de cidadão; reconsulta confirmou `INSERT=false` e `SELECT=false` em todas as sete tabelas para os dois papéis.
- Testes de regressão reais com os papéis A e B: `consulta_segura` com chave fictícia correta continuou retornando assunto/status, e `consulta_nomes_anexos_segura` continuou retornando somente o nome fictício do arquivo.
- O modelo de autorização atual é **por posse de protocolo + segredo**, não por isolamento rígido entre os papéis A e B: ambos conseguem acessar o registro A quando fornecem sua chave correta. Não representar isso como isolamento por identidade; a proteção depende da confidencialidade da chave e da validação do servidor.
- Produção Supabase não modificada.

## Auditoria complementar de privilégios — 2026-11-07
- Inspecionados privilégios `TRUNCATE`, `REFERENCES` e `TRIGGER` para os dois papéis cidadãos nas sete tabelas: todos `false`.
- Inspecionado esquema `mandato_testes`: os papéis A, B e administrador têm `USAGE=true`, `CREATE=false`.
- Matriz completa de execução das oito funções auditada: cidadãos executam apenas `consulta_segura`, `consulta_respostas_segura`, `consulta_historico_segura`, `consulta_nomes_anexos_segura` e `pedir_recuperacao`; administrador de testes executa apenas `decidir_recuperacao`; nenhuma das três funções `consulta_anexos_segura` (caminho privado) ou `criar_solicitacao_segura` (identidade arbitrária) está disponível a esses papéis.
- Essa auditoria verifica privilégios, **não substitui** testes da aplicação HTTP, da identidade administrativa, do armazenamento de anexos ou da migração.

## Regressão de autorização administrativa HTTP — 2026-11-07
- Revisada a implementação `homologacao/api-neon/server.mjs`: rota `POST /api/admin/recuperacoes/{id}/decisao` exige token administrativo e confirmação de identidade retornada por `verificarIdentidade` no servidor; `identidadeConfirmada` no corpo não é usada como prova.
- Adicionados dois testes em `homologacao/api-neon/server.test.mjs`: (1) sem verificador configurado, nem `aprovar:true` nem `aprovar:false` com `identidadeConfirmada:true` podem acionar `operacoes.decidir`; (2) verificador que retorna `false` ou lança exceção deve resultar em HTTP 403, sem chamar decisão.
- **Testes adicionados, ainda não executados.** A verificação de identidade real e a entrega da nova chave ainda não estão implementadas para produção; nenhuma rota administrativa foi ativada.

## Consultas auxiliares com chave incorreta e inicialização fechada — 2026-11-07
- Em Neon, com os papéis `mandato_cidadao_a` e `mandato_cidadao_b`, executadas `consulta_respostas_segura`, `consulta_historico_segura` e `consulta_nomes_anexos_segura` para `HIST-TESTE-900001` usando chave fictícia incorreta `repeat('b',64)`. As seis consultas retornaram **zero linhas**.
- Revisado `iniciar-homologacao.mjs`: rotas cidadãs só são fornecidas ao servidor quando `HABILITAR_ROTAS_CIDADAO_TESTES='sim'` além das demais verificações de ambiente. Adicionado teste HTTP de regressão em `iniciar-homologacao.test.mjs` para exigir 503 nas duas rotas sem habilitação separada e `rotasCidadaoHabilitadas=false` no `/health`.
- O teste Node foi escrito e versionado, **não executado**; não há servidor de homologação publicado.

## Auditoria de sequências PostgreSQL — 2026-11-07
- A consulta `has_sequence_privilege` identificou `USAGE=true` e `SELECT=true` para os dois papéis cidadãos em `anexos_id_seq`, `respostas_id_seq` e `solicitacoes_id_seq` (apesar da revogação dos privilégios nas tabelas).
- Aplicado no **Neon isolado** `REVOKE USAGE, SELECT ON ALL SEQUENCES IN SCHEMA mandato_testes FROM mandato_cidadao_a, mandato_cidadao_b`.
- Auditoria posterior das cinco sequências do esquema confirmou `USAGE=false` e `SELECT=false` para ambos os papéis.
- Regressão SQL com os dois papéis: `consulta_segura` com chave correta retornou assunto/status e `consulta_nomes_anexos_segura` retornou apenas nome fictício do anexo. Nenhum dado real foi alterado.

## Endurecimento de políticas RLS antigas — 2026-11-07
- Auditoria de `pg_policies` identificou políticas `FOR ALL` nos registros `solicitacoes` e `anexos` para os dois papéis cidadãos. A política de anexos incluía tautologia `s.cidadao_id = s.cidadao_id`, que não valida a identidade da solicitação.
- Como o modelo de homologação deve usar **somente funções com protocolo + segredo**, as quatro políticas foram alteradas com `ALTER POLICY ... USING (false) WITH CHECK (false)`, somente no Neon isolado.
- Consulta posterior a `pg_policies` confirmou `qual=false` e `with_check=false` para as quatro políticas.
- Regressão SQL real após a mudança: ambos os papéis cidadãos ainda obtêm assunto/status, nome de anexo fictício e histórico público fictício por funções seguras com chave correta. Isso **não** prova isolamento entre os papéis: a chave válida é a autorização.
- Nenhum dado real ou ambiente de produção foi alterado.

## Entradas adulteradas em consultas seguras — 2026-11-07
- Executados testes SQL no Neon isolado sob `SET LOCAL ROLE mandato_cidadao_a` para `consulta_segura` e `consulta_historico_segura`, sempre com dados fictícios.
- Três cenários: protocolo contendo `' OR 1=1 --` com chave válida; chave contendo `' OR '1'='1` com protocolo válido; chave correta de 64 caracteres alterada no último caractere.
- **Seis consultas retornaram zero linhas**, sem expor assunto ou histórico. Strings foram escapadas como literais SQL no executor de teste; a API do projeto usa consultas parametrizadas, a serem testadas na suíte Node.
- Esta evidência não comprova ausência de todas as classes de injeção, nem substitui testes integrados HTTP e de autenticação.

## Correção prioritária de autorização HTTP — 2026-11-07
- Detectada lacuna de contexto: `verificarIdentidade` recebia somente `pedidoId`, sem o token do administrador autenticado. Isso dificultaria vincular a confirmação de identidade à sessão autorizada.
- Corrigido `server.mjs` para passar `{pedidoId, token:req.headers.authorization.slice(7)}` ao verificador **somente depois** de `verificarAdmin` retornar `true`. O token continua restrito ao servidor e não é incluído na resposta.
- Adicionado teste em `server.test.mjs` que envia token falso no corpo, verifica que o verificador recebe apenas o token autenticado do cabeçalho e exige HTTP 403 sem decisão quando identidade não confirmada.
- **Teste Node ainda não executado.** A API administrativa segue desativada no inicializador de homologação; não foi feita alteração na produção.

## Execução local de bateria HTTP prioritária — 2026-11-07
- Como o ambiente de execução não conseguiu resolver `github.com` para clonar o repositório, foram **reproduzidos localmente** os módulos `server.mjs` e `limitador.mjs` a partir dos conteúdos inspecionados no GitHub, e criado arquivo local independente `seguranca.test.mjs` com seis testes usando `node:test` e `fetch` HTTP em `127.0.0.1`.
- Comando executado: `node --test /mnt/data/mandato-testes/seguranca.test.mjs`.
- Resultado observado: **6 testes aprovados, 0 falhas**, duração aproximada 338 ms.
- Cobertura: rotas sem handlers respondem 503; origem externa 403; token administrativo ausente/inválido 401/403; decisão sem verificação de identidade 403; token do verificador vem do cabeçalho autenticado e não do corpo; JSON malformado 400 e corpo acima de 4096 bytes 413.
- **Limitação essencial:** bateria local reproduzida, não a suíte original integral do repositório, nem teste integrado com banco Neon real. Não houve deploy nem conexão ao Supabase de produção. Ainda faltam execução integral, validação de identidade real e migração coordenada.

## Segunda bateria HTTP local executada — 2026-11-07
- No ambiente local `/mnt/data/mandato-testes`, foram adicionados cinco cenários independentes em `extra.test.mjs` à bateria anterior de seis cenários, cobrindo CORS, limitação por IP, ausência de handler administrativo, confirmação de identidade ausente e token autenticado do cabeçalho.
- Comando realmente executado: `node --test /mnt/data/mandato-testes/*.test.mjs` (Node v22.16.0).
- Saída observada: **11 testes aprovados, 0 falhas**, duração ~303 ms.
- **Escopo e limitação:** os arquivos locais são reproduções dos componentes da API e testes independentes derivados dos casos versionados. Ainda **não** foi executada a suíte original integral do GitHub, nem teste HTTP com Neon real. A produção segue intacta.
