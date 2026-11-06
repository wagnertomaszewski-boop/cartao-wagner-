# Auditoria adicional: rotas legadas de protocolo

Confirmado no banco de producao em 06/11/2026:

1. consulta_publica_protocolo(p_protocolo): retorna dados de solicitacao sem chave privada.
2. consulta_publica_respostas_protocolo(p_protocolo): retorna mensagens e anexos sem chave privada.
3. consultar_protocolo(p_protocolo): retorna protocolo, assunto, descricao, localidade e status sem chave privada.
4. consulta_publica_historico_protocolo(p_protocolo): retorna status e datas de historico sem chave privada.

As quatro funcoes sao SECURITY DEFINER e usam protocolo sequencial como identificador de consulta. A auditoria automatica confirma que as funcoes podem ser executadas anonimamente.

## Corte de seguranca

Depois de validar e publicar a interface privada, retirar EXECUTE para PUBLIC, anon e authenticated das quatro funcoes antigas, salvo se uma dependencia administrativa exigir substituicao antes do corte.

As revogacoes devem ocorrer em transacao revisada e em janela coordenada, para evitar uma interface nova que ainda consulte rotas antigas.

## Verificacao obrigatoria

Executar testes de acesso anonimo em cada uma das quatro RPCs e exigir HTTP 401/403 ou permissao negada. Conferir chamadas feitas por index.html, acompanhar.html, painel e aplicacoes moveis. Testar tambem acesso direto ao Storage.

Nenhuma revogacao foi aplicada a producao.
