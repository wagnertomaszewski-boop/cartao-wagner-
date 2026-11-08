# Homologação Neon: acesso mínimo verificado — 2026-11-08

Projeto Neon `proud-firefly-64745516`, banco `neondb`,
esquema isolado `mandato_chaves_homologacao`.

## Alteração aplicada somente na homologação

- Criada função `consultar_chave(text, bytea)` com `SECURITY DEFINER`,
  `search_path=pg_catalog`, retorno restrito a `assunto,status`.
- EXECUTE revogado de PUBLIC e concedido apenas ao papel
  `mandato_api_homologacao`.
- Revogados todos os privilégios diretos desse papel sobre as duas tabelas
  sintéticas, inclusive SELECT de `chave_hash`, INSERT e UPDATE.
- Função faz JOIN por protocolo e hash de 32 bytes e exige
  `revogada_em IS NULL`.

## Resultados executados

1. Consulta com hash correto no registro fictício `TESTE-900010`:
   **1 linha**, assunto e status.
2. Consulta com hash incorreto: **0 linhas**.
3. Consulta do registro `TESTE-900009` já revogado:
   **0 linhas**.
4. SELECT direto em `chaves_acompanhamento` como papel da API:
   **SQLSTATE 42501 — permission denied**.
5. Suite Node local, pasta `/mnt/data/validacao-v2`,
   `node --test *.test.mjs`: **1 teste, 1 aprovado, 0 falhas**.

## Limitações

- A função é apenas de **leitura**. Emissão e revogação ficaram
  bloqueadas ao papel da API até criar funções restritas específicas,
  com autenticação e autorização auditadas.
- `SECURITY DEFINER` exige revisão do proprietário e do modelo de
  confiança antes de produção. Nenhuma política ou função desta
  homologação deve ser copiada automaticamente para produção.
- Ainda não houve teste Node TCP→Neon nem integração do servidor HTTP
  com o banco real.
- Nenhuma alteração no Supabase de produção.
