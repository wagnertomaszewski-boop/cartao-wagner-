# Mapa de dependências das consultas públicas por protocolo

Verificado na branch `feature/recuperacao-whatsapp-manual`, novembro de 2026. **Inventário apenas; sem mudanças em produção.**

| Cliente | consulta_publica_protocolo | consulta_publica_historico_protocolo | consulta_publica_respostas_protocolo | consultar_protocolo |
|---|---|---|---|---|
| `acompanhar.html` (raiz) | Sim | Não identificado | Sim | Não identificado |
| `v2/acompanhar.html` | Sim | Sim | Sim | Não identificado |
| `v2/index.html` | Sim | Sim | Sim | Não identificado |
| `painel/index.html` | Não identificado | Não identificado | Não identificado | Não identificado |
| `admin-app/index.html` | Não identificado | Não identificado | Não identificado | Não identificado |
| `solicitacao.html` | Não identificado | Não identificado | Não identificado | Não identificado |

**Escopo:** inspeção textual desses seis arquivos; não é uma varredura completa de todos os arquivos históricos, clientes externos ou versões instaladas. `consultar_protocolo` permanece acessível a `anon` no banco, mesmo sem uso identificado nesses arquivos.

## Ordem de implementação
1. Preparar acesso seguro também em `acompanhar.html` e `v2/acompanhar.html`, não apenas `v2/index.html`.
2. Cobrir histórico e respostas; nenhuma RPC antiga pode permanecer como fallback de dados privados após ativação.
3. Inventariar versões instaladas e possíveis outros clientes antes de retirar permissões das quatro RPCs.
4. Resolver emissão de chave para protocolos antigos antes de qualquer restrição.
5. Testar em ambiente isolado e exigir aprovação específica para alteração em produção.

**Atenção:** retirar permissões de RPCs agora quebraria páginas existentes; manter produção inalterada até o plano completo.
