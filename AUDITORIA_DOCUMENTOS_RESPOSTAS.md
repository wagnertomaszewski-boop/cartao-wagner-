# Revisao de privacidade dos documentos de resposta

Verificacao no Supabase (06/11/2026):
- Bucket anexos-solicitacoes: privado.
- Bucket documentos-respostas: publico.
- A pagina antiga acompanhar.html recebe URLs de anexos da funcao consulta_publica_respostas_protocolo.

## Risco
Mesmo que o acompanhamento passe a exigir um link privado, URLs diretas de documentos em bucket publico podem continuar acessiveis por qualquer pessoa que conheca a URL.

## Mudanca necessaria (nao executar sem janela de migracao)
1. Inventariar os caminhos de arquivos referenciados em respostas_solicitacoes e os links gravados em anexos.
2. Confirmar se existem URLs externas, links assinados ou arquivos compartilhados intencionalmente.
3. Migrar documentos de resposta para bucket privado ou converter o bucket atual para privado depois de atualizar o painel.
4. Criar um endpoint de download que valide a chave da solicitacao e a associacao do arquivo a resposta daquela solicitacao.
5. Emitir URLs assinadas com prazo curto, sem registrar tokens em logs ou analytics.
6. Revisar permissao de upload anonimo, nomes dos arquivos, tipo MIME e tamanho maximo.
7. Testar acesso a documento de outra solicitacao, URL vencida, chave revogada e link antigo.
8. Desabilitar consulta_publica_respostas_protocolo e consulta_publica_protocolo para anon na mesma janela da ativacao da nova interface.

## Estado
Apenas auditoria e documentacao. Nenhuma configuracao de Storage ou funcao de producao foi alterada.
