# Auditoria SECURITY DEFINER — 2026-11-07, rodada 3

Escopo: projeto Neon de testes `proud-firefly-64745516`, inspeção SQL somente leitura. Nenhum dado real, produção Supabase, ou branch main alterado.

## Execução verificável
1. `SELECT n.nspname,p.proname,pg_get_functiondef(p.oid) ... WHERE p.prosecdef ...`: retornou oito funções SECURITY DEFINER no schema `mandato_testes`. Inspecionados os oito corpos.
2. Primeira tentativa de consultar privilégios via `has_function_privilege('PUBLIC',...)` falhou com SQLSTATE 42704: PUBLIC não é uma role nomeada. **Não é resultado de teste de autorização.**
3. Consulta corrigida com `has_function_privilege('mandato_api_homologacao',p.oid,'EXECUTE')` e `aclexplode(coalesce(p.proacl,acldefault('f',p.proowner)))` para grantee 0: cinco funções EXECUTE para API, três negadas; nenhuma das oito com EXECUTE público.

| Função | API EXECUTE | PUBLIC EXECUTE |
| --- | --- | --- |
| consulta_anexos_segura | não | não |
| consulta_historico_segura | sim | não |
| consulta_nomes_anexos_segura | sim | não |
| consulta_respostas_segura | sim | não |
| consulta_segura | sim | não |
| criar_solicitacao_segura | não | não |
| decidir_recuperacao | não | não |
| pedir_recuperacao | sim | não |

## Análise estática dos corpos SQL
- Todas as oito funções definem `SET search_path TO ''` e usam referências explícitas a tabelas `mandato_testes`.
- As quatro funções de consulta habilitadas exigem correspondência de protocolo e hash SHA-256 da chave, com mínimo de 32 caracteres. Histórico restringe `visivel_cidadao IS TRUE`.
- `pedir_recuperacao` compara WhatsApp normalizado, aplica lock transacional e impede nova solicitação pendente ou criada nas últimas 24 horas; retorna `true` independentemente da existência do contato.
- `consulta_anexos_segura` retorna `caminho_privado`, mas **não** está concedida à conta da API; a função concedida `consulta_nomes_anexos_segura` retorna apenas nomes. Não conceder acesso à primeira sem revisão específica.
- `decidir_recuperacao` pode trocar a chave de acesso; permanece sem EXECUTE para a conta da API. Não habilitar até verificar identidade administrativa no servidor.
- Verificar se nomes de arquivos e observações de histórico estão adequadamente sanitizados no frontend; o banco não garante renderização segura.

## Limitações e bloqueios
Esta rodada **não** executou testes Node, smoke HTTP-Neon, teste de autenticação com tokens reais, isolamento com duas solicitações fictícias ou migração. Inspeção de código e ACL não equivale a teste dinâmico. A saúde HTTP /health observada anteriormente não comprova acesso ao banco.

## Plano de próxima validação
1. Rodar suíte Node original e registrar saída e commit.
2. Rodar smoke HTTP-Neon com credenciais de serviço isoladas, somente dados fictícios e segredo protegido; não ativar rotas públicas.
3. Testar consultas com protocolo/chave errados e cruzados entre dois registros fictícios, mais bloqueios 401/403.
4. Documentar rollback e migração gradual; exigir autorização expressa para qualquer ativação.

**Decisão:** manter `HABILITAR_ROTAS_CIDADAO_TESTES=nao` e produção inalterada.
