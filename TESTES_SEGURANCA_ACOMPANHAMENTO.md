# Plano de testes do acompanhamento privado

Este documento se aplica apenas a ramificacao de desenvolvimento. Nenhuma alteracao no banco de producao esta autorizada por este arquivo.

## Verificacoes obrigatorias

- Criar solicitacao de teste e receber protocolo e chave privada no mesmo retorno.
- Abrir o link no mesmo celular, sem login e sem leitor de QR.
- Abrir em outro navegador usando o link copiado.
- Consultar um protocolo sequencial sem chave: nenhum dado privado deve ser exibido.
- Trocar um caractere da chave: a consulta deve ser recusada.
- Usar chave da solicitacao A para acessar dados ou anexos da B: deve falhar.
- Revogar a chave e testar novamente: deve falhar.
- Conferir que notas internas, lembretes e telefone nao aparecem na resposta publica.
- Testar anexos com URL expirada e acesso direto sem credencial.
- Verificar se o painel administrativo continua funcionando.
- Testar solicitacoes antigas sem conceder acesso apenas pelo protocolo.
- Testar ausencia de token nos logs, historico de rede e ferramentas analiticas.

## Ordem segura de publicacao

1. Revisar o banco e as politicas de Storage.
2. Implantar novas funcoes sem remover as antigas.
3. Validar fluxo de ponta a ponta em ambiente de homologacao.
4. Publicar a nova interface.
5. Bloquear consultas anonimas antigas na mesma janela de migracao, com plano de reversao.
6. Monitorar erros e tentativas de acesso.

Atenção: enquanto as funcoes antigas continuarem acessiveis por protocolo, a falha de privacidade permanece.
