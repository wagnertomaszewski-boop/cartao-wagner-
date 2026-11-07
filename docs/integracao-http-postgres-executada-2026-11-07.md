# Execução de integração HTTP–PostgreSQL — 2026-11-07

## Execução efetiva
Ambiente: Node v22.16.0, comando `node --test integracao.test.mjs`, duração total 190,825 ms. **4 testes executados; 4 aprovados; 0 falhas.**

1. HTTP → adaptador de operações → executor PostgreSQL com driver simulado: resposta 200, projeção sem campos privados, quatro transações `SET LOCAL ROLE mandato_cidadao_a`, quatro `COMMIT` e quatro conexões liberadas.
2. Corpo HTTP acima de 4096 bytes: 413, nenhuma consulta ao banco.
3. Decisão administrativa sem autenticação: 403, nenhuma consulta ao banco.
4. Origem HTTP não autorizada: 403, nenhuma consulta ao banco.

## Escopo e limitações
O teste foi executado em arquivos locais reconstruídos manualmente a partir dos módulos consultados no GitHub, com implementações condensadas e **driver PostgreSQL simulado**. Portanto não é uma execução byte a byte da suíte original do repositório nem uma conexão HTTP com o Neon. Não valida permissões SQL reais, comunicação TLS real, integração Supabase Auth ou WhatsApp.

A falha DNS do terminal impede `git clone`; a integração GitHub conectada funciona. Nenhum dado real, ambiente de produção, Supabase ou branch `main` foi alterado.

## Próximo teste obrigatório
Executar o conjunto original do repositório sem reconstrução manual, depois HTTP com driver `pg` conectado à conta restrita `mandato_api_homologacao` no Neon de testes `proud-firefly-64745516`. Não habilitar rotas em produção.
