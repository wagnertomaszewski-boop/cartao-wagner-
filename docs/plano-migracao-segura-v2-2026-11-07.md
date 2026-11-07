# Plano de migração segura — V2 (rascunho de homologação, 2026-11-07)

## Estado verificado
- Projeto Neon de testes: `proud-firefly-64745516`; **a branch Neon chama-se `production`, mas não é a produção Supabase**.
- Conta `mandato_api_homologacao` possui LOGIN e papel `mandato_cidadao_a`, não possui BYPASSRLS nem acesso administrativo.
- SQL real: função de consulta segura para protocolo inexistente retorna zero registros; acesso direto à tabela de solicitações e execução de decisão administrativa foram rejeitados com SQLSTATE 42501.
- O HTTP da branch possui testes com driver simulado. **Não existe evidência de HTTP + driver PostgreSQL real + Neon na mesma execução**.

## Portões obrigatórios antes de qualquer ativação
1. Inventariar esquema e RLS em **ambiente de testes**, sem copiar dados reais; criar dois pedidos e duas chaves fictícias.
2. Validar com conexão PostgreSQL de `mandato_api_homologacao` as quatro funções de leitura e a negativa cruzada A/chave B e B/chave A. Não usar conta proprietária na API.
3. Subir API HTTP apenas em localhost/homologação; usar `DATABASE_URL` exclusivamente em variável de ambiente do servidor; TLS estrito para Neon remoto; não registrar segredos.
4. Executar testes HTTP reais: autenticação ausente/inválida, chave incorreta, protocolo inexistente, rate limit, corpo grande, origem não autorizada, CORS e falha do banco. Repetir isolamento de dois pedidos existentes.
5. Validar autorização administrativa separada e prova de identidade **no servidor**, incluindo bloqueio de aprovações sem prova. Não usar token de cidadão como credencial administrativa.
6. Planejar migração de pedidos antigos: manter identificadores, histórico e anexos, emitir chaves de recuperação individualizadas sem divulgar em URL pública ou log, garantir mecanismo manual auditável. Sem migração automática até autorização explícita.
7. Revisar LGPD, backups, restauração, monitoramento, custos e plano de reversão. Obter autorização expressa antes de alterar produção ou publicar nova versão.

## Critério de aceite
Todos os testes acima com evidências reproduzíveis e zero falhas críticas; revisão de segurança e autorização explícita. Se qualquer portão falhar, manter segurança nova desabilitada e sistema publicado intacto.

## Rollback
Não ativar feature flag até aceite; se for aprovada futura implantação, registrar versão anterior, backup verificável, procedimento de desativação imediata e validação pós-reversão.

## Restrições desta rodada
Documento de planejamento apenas. Não executa migração, não habilita API e não altera Supabase, moradores ou branch main.
