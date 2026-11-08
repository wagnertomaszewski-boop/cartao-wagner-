# Teste PostgreSQL real — homologação Neon — 2026-11-08

Projeto: `proud-firefly-64745516`, banco `neondb`, PostgreSQL 18.6.
Somente esquema **`mandato_chaves_homologacao`**; nenhuma tabela
de cidadãos ou Supabase de produção foi alterada.

## Execuções confirmadas

1. Criadas tabelas sintéticas `solicitacoes` e `chaves_acompanhamento`.
   Ambas com RLS ENABLE + FORCE, inicialmente sem políticas.
2. Concedidas permissões específicas ao papel
   `mandato_api_homologacao` nesse esquema sintético.
   Criadas políticas RLS para leitura da solicitação e leitura/inserção/
   atualização da chave sintética. Não concedido DELETE.
3. Criada solicitação fictícia `TESTE-900008`, ID 900008.
4. Papel da API leu solicitação sintética: **OK**.
5. Papel da API gravou hash de 32 bytes: **OK**.
6. Consulta por protocolo + hash correspondente: **1 linha**, OK.
7. Consulta por protocolo + hash incorreto: **0 linhas**, OK.
8. Tentativa de emissão duplicada com ON CONFLICT DO NOTHING:
   **0 linhas**, OK.
9. Revogação via UPDATE de `revogada_em`: **1 linha**, OK.
10. Repetição da consulta com hash anteriormente válido após revogação:
    **0 linhas**, OK.

## Limites de evidência e segurança

- Esta é uma execução SQL real com **hash sintético fixo**, não um teste
  do processo Node/HTTP com segredo aleatório ponta a ponta.
- A estrutura de homologação usa nomes diferentes da consulta de produção:
  `mandato_chaves_homologacao.*` versus
  `public.solicitacoes` + `mandato_privado.chaves_acompanhamento`.
- **Não reutilizar em produção** as políticas amplas de SELECT/UPDATE
  criadas exclusivamente para dados fictícios. Acesso direto a
  `chave_hash` pelo papel de API é inadequado para o modelo final;
  a produção exige funções restritas e revisão de privilégios.
- Os testes automatizados Node e o CI ainda precisam ter execução
  comprovada. A API de produção permanece desabilitada.
- Registro sintético revogado permanece no Neon para auditoria de teste.
