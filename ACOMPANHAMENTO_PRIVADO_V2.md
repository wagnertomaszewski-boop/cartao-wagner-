# Acompanhamento privado V2

Diagnostico confirmado: as funcoes consulta_publica_protocolo e consulta_publica_respostas_protocolo usam SECURITY DEFINER e permitem consulta anonima por protocolo sequencial.

Plano de correcao:
1. Criar credencial aleatoria por solicitacao no servidor; guardar somente hash.
2. Exigir credencial para consultar solicitacao, respostas e anexos.
3. Entregar link privado ao criar solicitacao e comprovante com link clicavel.
4. Revogar acesso anonimo as consultas antigas somente quando novo fluxo estiver testado e ativo.
5. Preservar atendimento administrativo e migrar solicitacoes antigas mediante verificacao de titularidade.

Nao publicar ou alterar producao antes de testes de isolamento e de arquivos privados.
