# Contrato de integração da recuperação (homologação)

Data: 2026-11-06. **Não executar na produção.**

## Verificação no Neon isolado

As funções existentes no schema `mandato_testes` são:

- `pedir_recuperacao(p_protocolo text,p_whatsapp text)`: executável pelo papel de cidadão, não pelo papel de administrador.
- `decidir_recuperacao(p_pedido_id bigint,p_aprovar boolean)`: executável somente pelo papel de administrador de teste.
- `consulta_segura(p_protocolo text,p_segredo text)`: executável pelo papel de cidadão, não pelo papel de administrador.

Todas são `SECURITY DEFINER`. A verificação foi feita consultando o catálogo PostgreSQL e as permissões, sem alterar dados.

## Impedimento de integração direta

O adaptador frontend utiliza os nomes propostos `pedir_recuperacao_segura`, `listar_recuperacoes_admin` e `decidir_recuperacao_admin`, mas **esses nomes ainda não existem no banco Neon**. Além disso, Neon PostgreSQL não disponibiliza automaticamente o endpoint REST `/rest/v1/rpc` do Supabase. Portanto, não configurar o adaptador para apontar diretamente ao Neon: a chamada falharia.

## Próximas entregas necessárias

1. Criar projeto Supabase **separado** de homologação, sem dados reais; aprovar seu identificador no adaptador.
2. Aplicar migração revisada para PostgreSQL/Supabase, incluindo permissões explícitas de EXECUTE, checagem de `auth.uid()` administrativo e políticas RLS.
3. Implementar as três RPCs com os nomes acordados, e confirmar o contrato de parâmetros e respostas com testes de integração.
4. Criar endpoint de consulta com protocolo **e chave**, migrando os dados antigos e desabilitando as RPCs públicas que hoje permitem consulta só por protocolo, em lançamento coordenado com o app.
5. Garantir proteção de anexos com URLs assinadas e autorização no servidor; não expor caminhos privados.
6. Aplicar limites de tentativa por origem e protocolo e registrar auditoria sem armazenar chave em texto simples.
7. Só depois conectar a UI e considerar publicação.

## Limites de segurança

Bloqueios no JavaScript servem para evitar erro operacional, **não** são barreira de segurança: podem ser alterados no navegador. O servidor deve impor autenticação, autorização e limites de acesso. Não publicar chave secreta nem dados reais no GitHub.
