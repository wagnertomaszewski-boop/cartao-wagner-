# Verificação física do APK de homologação

Estado: preparado; **não executado em aparelho pelo agente**.
Aplicativo: Painel do Mandato Homologação.
Pacote: `br.com.wagnertomaszewski.painelmandato.homologacao`.
Servidor único: `https://mandato-neon-homologacao.onrender.com/hml/`.
Não instalar um pacote de produção para este ensaio e não publicar na Play Store.

1. Baixar o APK identificado no relatório final e instalar no Android autorizado.
   Registrar versão Android, modelo, commit/build e horário. Se uma versão debug
   antiga impedir a instalação por assinatura incompatível, remover **somente o
   aplicativo identificado como Homologação**. Preservar o aplicativo publicado.
   Os registros no servidor permanecem; dados e sessão locais do teste serão reiniciados.
2. Abrir e conferir o título Homologação. Fazer login e MFA diretamente na tela
   segura. Não enviar senha, TOTP, código de recuperação ou telefone no chat.
3. Criar atendimento fictício em Solicitações. Guardar protocolo e chave somente
   em local privado. Conferir entrada no catálogo autenticado do Painel.
4. Para câmera, usar apenas imagem de uma folha com a palavra TESTE, sem pessoas,
   documentos ou dados reais de cidadãos. Verificar se o seletor oferece câmera.
   Caso ofereça somente galeria, tirar a foto pelo aplicativo de câmera e escolher
   pela galeria; registrar a captura direta como pendência, sem declarar aprovação.
   PNG/JPEG/PDF têm limite de 1 MB nesta homologação.
5. Se desejar testar GPS, marcar autorização e tocar Usar localização autorizada.
   Conferir o aviso do aplicativo e a permissão do Android. Negar primeiro e
   comprovar que o formulário continua utilizável com localidade escrita.
   Autorizar depois somente se concordar em registrar a própria localização no
   servidor de testes. Ela não deve aparecer no acompanhamento público.
6. Consultar com protocolo e chave. Tentar sem chave e com chave errada: dados
   privados não devem abrir. Gerar QR e confirmar que ele contém somente a tela e
   o protocolo, continuando a pedir a chave no aparelho leitor.
7. Pelo Painel, registrar Em análise, Encaminhado, Em andamento, resposta,
   fiscalização, cobrança, prazo e lembrete; depois concluir com resultado.
   Conferir histórico, responsáveis, datas e resposta no acompanhamento privado.
8. Anexar imagens antes/depois a registros internos. Conferir comparação no
   Painel e recusa de leitura desses arquivos pelo acompanhamento do cidadão.
   Testar download de documento autorizado e exportação CSV: escolher o destino
   no diálogo do Android e abrir o arquivo salvo. Cancelar um segundo salvamento
   e comprovar que nenhum arquivo foi anunciado como salvo.
9. Abrir projetos, detalhes, emendas, notícias e agenda. Conferir voltar, teclado,
   orientação e navegação; preservar as imagens aprovadas do vereador.
10. Se testar WhatsApp, usar apenas o próprio número autorizado no assistente
    seguro. Conferir identidade e destinatário, aprovar e gerar código. Tocar no
    botão e verificar se WhatsApp/Business abre com o contato certo. O proprietário
    confirma o envio manual. Abrir WhatsApp não comprova entrega.
11. Registrar falhas com o texto da mensagem e etapa. Não incluir códigos,
    chaves, números pessoais ou localização em capturas públicas.

A aprovação física depende dessas evidências. O ensaio não autoriza produção,
publicação, contratação ou alteração dos aplicativos publicados. Lembretes nesta
etapa são registros internos; avisos automáticos e notificações do sistema não
foram apresentados como concluídos.
