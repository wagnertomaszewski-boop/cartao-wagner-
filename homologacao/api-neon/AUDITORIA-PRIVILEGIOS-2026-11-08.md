# Auditoria de privilégios — Neon homologação — 08/11/2026

Consulta somente leitura ao projeto `proud-firefly-64745516`, esquema `mandato_testes`. Foram encontradas 14 funções; nenhuma concede EXECUTE a PUBLIC. Onze concedem EXECUTE ao papel `mandato_api_homologacao`, três não concedem. Todas estão com SECURITY DEFINER e `proconfig` preenchido.

## EXECUTE concedido ao papel de API (revisar necessidade)

- aprovacao_emissao_teste_900006
- consulta_historico_segura
- consulta_nomes_anexos_segura
- consulta_respostas_segura
- consulta_segura
- consultar_decisao_identidade_privada
- emitir_chave_legada_teste_900004
- emitir_chave_legada_teste_900005
- emitir_chave_legada_teste_900006
- pedir_recuperacao
- registrar_decisao_sintetica_900007

## EXECUTE não concedido ao papel de API

- consulta_anexos_segura
- criar_solicitacao_segura
- decidir_recuperacao

## Avaliação e bloqueios

A ausência de EXECUTE para PUBLIC é necessária, mas não comprova autorização de negócio. Revisar especialmente funções auxiliares de emissão `900004`/`900005`/`900006`, aprovação `900006` e gravação `900007` para garantir que não possam ser invocadas fora dos testes autorizados. Não executar REVOKE/GRANT automaticamente: mudanças podem quebrar dependências. Confirmar também políticas RLS, proprietário SECURITY DEFINER, validação de argumentos e integração HTTP com token válido e inválido.

Nenhuma alteração SQL realizada nesta auditoria. Não aprova ativação de produção.
