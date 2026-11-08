# Execução real: chave Node.js + Neon — 2026-11-08

Ambiente: PostgreSQL Neon de homologação, projeto `proud-firefly-64745516`,
esquema `mandato_chaves_homologacao`, papel de API
`mandato_api_homologacao`.

## Execução verificada

- Node.js v22.16.0 gerou 32 bytes aleatórios e calculou SHA-256.
- O **hash**, sem armazenar a chave em SQL, foi gravado para a solicitação
  fictícia `TESTE-900009` (ID 900009).
- Consulta pelo protocolo e hash correto: **1 linha**.
- Consulta com hash incorreto: **0 linhas**.
- Segunda emissão para o mesmo ID via `ON CONFLICT DO NOTHING`:
  **0 linhas**.
- Revogação via `revogada_em=now()`: **1 linha**.
- Consulta após revogação com hash anteriormente válido: **0 linhas**.

## Limites

A geração criptográfica foi executada no Node.js local e as instruções SQL
foram executadas separadamente pelo conector autenticado do Neon. **Não
houve conexão TCP direta Node→Neon nem teste do servidor HTTP com PostgreSQL
real.** O ambiente local não possui o pacote `pg` instalado nem acesso DNS
ao GitHub; portanto essa etapa não pode ser declarada concluída.

Não foram alteradas tabelas de cidadãos, permissões de produção nem
aplicativo publicado. O registro fictício revogado foi mantido para auditoria.
As políticas amplas de homologação **não são apropriadas para produção**.
