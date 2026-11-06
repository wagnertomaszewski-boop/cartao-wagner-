# Homologação dos documentos de resposta — V2

## Constatações verificadas em 06/11/2026 (consulta somente leitura)
- `public.respostas_solicitacoes.anexos` é `jsonb`; as 9 linhas existentes contêm arrays JSON.
- `public.solicitacoes.anexos` é um array PostgreSQL.
- O bucket `anexos-solicitacoes` é privado, mas o bucket `documentos-respostas` estava público na auditoria anterior.
- O link privado do cidadão **não** é uma credencial Supabase Auth; não basta mudar o bucket para privado e manter URLs públicas.

## Desenho obrigatório para download seguro
1. Armazenar os documentos em bucket privado e impedir acesso público direto.
2. Criar endpoint de download em Edge Function, ou backend equivalente, que recebe a chave privada e o identificador do documento.
3. Validar o hash da chave e a ausência de revogação **no servidor**, vinculando o documento à solicitação correta.
4. Conferir que o arquivo solicitado pertence aos anexos de uma resposta daquela solicitação; jamais confiar em caminho ou URL arbitrários enviados pelo cliente.
5. Usar credencial privilegiada **somente no servidor** para obter o arquivo ou criar URL assinada de curtíssima duração.
6. Aplicar limites de requisições, tamanho e tipo de arquivo; registrar falhas sem gravar a chave em logs.
7. Migrar as URLs existentes com inventário e validação; só então tornar `documentos-respostas` privado.
8. A interface privada deve renderizar anexos somente quando o endpoint estiver testado.

## Casos de teste
- Chave válida de A + documento de A: autorizado.
- Chave válida de A + documento de B: negado.
- Chave revogada: negado.
- Chave ausente, truncada ou inválida: negado.
- Documento inexistente ou caminho forjado: negado.
- URL pública antiga: inacessível após o corte.
- Painel administrativo: continua podendo anexar e consultar arquivos conforme autorização.
- Link privado reaberto em outro aparelho: funciona sem login.

## Bloqueios para publicação
- Não exibir links públicos antigos na nova interface.
- Não desligar o bucket público antes de migrar referências e testar o painel.
- Não colocar `service_role` ou secret key no GitHub Pages.
- Acesso antigo por protocolo e bucket público devem ser corrigidos no mesmo corte de produção.

Status: **plano técnico e testes definidos, sem migração executada**.
