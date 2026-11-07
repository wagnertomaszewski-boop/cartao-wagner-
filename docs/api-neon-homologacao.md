# API intermediária Neon — especificação de homologação

**Status:** desenho para implementação; não há servidor implantado. Nenhum projeto Supabase precisa ser criado.

## Por que é necessária
O Neon atual é PostgreSQL, não o serviço REST `/rest/v1/rpc` do Supabase. A interface nunca deve receber uma URL de conexão PostgreSQL, senha do banco ou credenciais administrativas.

## Endpoints propostos

- `POST /api/recuperacao/solicitar`: corpo `{protocolo,whatsapp}`. Retorna sempre resposta genérica, inclusive para dados inexistentes. Aplicar limite de tentativas por origem e identificador.
- `GET /api/admin/recuperacoes`: exige autenticação administrativa verificada **no servidor**; retorna somente pedidos pendentes e metadados mínimos.
- `POST /api/admin/recuperacoes/:id/decisao`: exige autenticação administrativa, confirmação da identidade e auditoria. Corpo `{aprovar,identidadeConfirmada}`. Em aprovação, gera chave nova no banco, invalida a anterior e exibe a nova chave apenas uma vez ao administrador.
- `POST /api/solicitacoes/consultar`: corpo `{protocolo,chave}`. Nunca retornar dados sem chave válida.

## Acesso PostgreSQL

1. Criar usuários SQL específicos e com privilégios mínimos no Neon de testes.
2. O servidor deve abrir transação e aplicar `SET LOCAL ROLE` para o papel adequado **apenas depois** de validar a autorização do usuário; nunca aceitar nome de papel vindo do navegador.
3. Executar as funções já existentes em `mandato_testes`: `pedir_recuperacao`, `decidir_recuperacao`, `consulta_segura`.
4. Usar parâmetros preparados, `statement_timeout`, TLS e conexão por segredo de ambiente. Nunca registrar protocolos com chaves ou tokens.
5. Impedir CORS amplo, aplicar proteção contra CSRF quando houver cookies e limitar tamanho das requisições.

## Bloqueadores antes de ligar a API

- Definir hospedagem gratuita disponível para a API; não assumir que Neon hospeda automaticamente o servidor HTTP.
- Implementar autenticação de administrador robusta (não confiar em checkbox, token estático no JavaScript ou `cidadao_id` fornecido pelo cliente).
- Criar rate limiting persistente ou de infraestrutura, especialmente contra tentativas inválidas.
- Testar concorrência e idempotência da aprovação; o segredo em texto claro deve aparecer uma única vez.
- Revisar a função de recuperação: lock baseado em `v_id::integer` pode transbordar quando ID superar 2.147.483.647.
- Criar testes HTTP de ponta a ponta com dados fictícios e provar que um cidadão não lê dados de outro.

**Regra de implantação:** não conectar a API ao Supabase real, não publicar endpoint aberto e não alterar o app até todas as verificações de autorização passarem.
