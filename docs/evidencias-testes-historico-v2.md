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
