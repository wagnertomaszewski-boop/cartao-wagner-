# Plano de migracao dos anexos - V2

Inventario verificado em 06/11/2026:
- anexos-solicitacoes: 54 objetos; bucket privado.
- documentos-respostas: 4 objetos; bucket publico.

## Implementacao segura
1. Inventariar referencias em respostas_solicitacoes.anexos e comparar com os quatro objetos de Storage.
2. Alterar painel administrativo para guardar bucket e caminho do objeto, nunca URL publica permanente.
3. Implementar funcao de servidor para validar a chave privada da solicitacao, confirmar que o objeto pertence a resposta dessa solicitacao e emitir URL assinada com expiracao curta.
4. Nao retornar URLs originais do banco diretamente ao navegador do cidadao.
5. Garantir que a revogacao da chave impeça novas assinaturas. URLs ja assinadas permanecem validas ate expirar.
6. Testar arquivos das solicitacoes A e B com chaves trocadas.
7. Somente depois de testar painel e frontend, tornar documentos-respostas privado e revogar as RPCs antigas por protocolo.
8. Verificar URLs compartilhadas anteriormente e comunicar aos usuarios afetados se necessario.

## Criterios de aceite
- Protocolo isolado nao revela dados nem respostas.
- Chave invalida nao retorna dados nem URL assinada.
- Acesso de uma solicitacao nao permite acessar arquivo de outra.
- O painel autenticado continua funcionando.
- Nenhuma URL permanente publica aparece no comprovante.

Este documento nao altera a configuracao de producao.
