# Validação HTTP–Neon — 2026-11-08

Escopo: somente API de homologação Render, repositório na branch `feature/recuperacao-whatsapp-manual` e projeto Neon `proud-firefly-64745516`. Nenhuma operação de escrita em tabelas de cidadãos ou Supabase de produção.

## Evidências observadas

- Deploy `dep-dbob7rmgekts739jh490`: status `live`, concluído às 17:40:31 UTC. Captura enviada pelo usuário confirmou GET `/health` com `status=ok`, `consultaPrivadaHabilitada=true`, `rotasCidadaoHabilitadas=false`. O health não comprova conexão SQL.
- Deploy `dep-dbob8kam5gnc73ejhca0`: `update_failed` às 17:42:31 UTC; autoteste HTTP local contra `POST /api/solicitacoes/consultar` não passou.
- Deploy `dep-dbob95p42hec73d7i7k0`: `update_failed` às 17:43:07 UTC; log `AUTOTESTE_NEON_DIAGNOSTICO: status=503; forma=erro-generico`.
- Deploy `dep-dbob9f7b9u1s73df98a0`: `update_failed` às 17:43:45 UTC; log `AUTOTESTE_NEON_SQLSTATE=28P01` seguido de HTTP 503. PostgreSQL SQLSTATE 28P01 indica falha de autenticação por senha, **não** falha da RPC ou de permissão de consulta comprovada.
- Verificação read-only da role Neon na branch primária `br-bitter-math-bei1cwt3`: `mandato_api_homologacao` existe e usa autenticação por senha. A branch isolada `br-lively-snow-bev5ecau` também existe; a verificação anterior da role não demonstrou que o Render está apontando para ela.

## Bloqueio e ações não executadas

A integração HTTP→PostgreSQL→RPC permanece **reprovada**. Não redefinir senha, modificar `DATABASE_URL`, migrar dados, alterar produção ou ativar segurança pública sem autorização explícita. Não publicar percentuais de conclusão.

## Próximos passos controlados

1. Conferir de forma não sensível qual branch Neon está configurada no Render e a existência da role nessa branch; nunca registrar a URL completa, senha ou token.
2. Com autorização para rotação de credencial, redefinir somente a senha da role restrita da branch isolada e atualizar a variável privada no Render; não tocar na branch Neon primária.
3. Repetir autoteste HTTP com protocolo sintético inexistente e chave aleatória, esperando resposta autorizada vazia, e registrar logs e deploy `live`.
4. Depois testar negação de credenciais incorretas, rate limit, CORS, isolamento de dados e permissões mínimas; somente então propor migração por etapas com rollback.

Este relatório distingue testes efetivamente executados de verificações futuras.
