-- CORTE DE ACESSO: NAO EXECUTAR ANTES DE PUBLICAR E TESTAR A V2 PRIVADA.
-- Execute na mesma janela de manutencao do frontend e do Storage.
begin;
revoke execute on function public.consulta_publica_protocolo(text) from public, anon, authenticated;
revoke execute on function public.consulta_publica_respostas_protocolo(text) from public, anon, authenticated;
revoke execute on function public.consulta_publica_historico_protocolo(text) from public, anon, authenticated;
revoke execute on function public.consultar_protocolo(text) from public, anon, authenticated;
commit;

-- VERIFICAR DEPOIS DO CORTE, USANDO A CONTA anon:
-- 1. Cada uma das quatro RPCs deve falhar com permissao negada.
-- 2. Acompanhamento privado deve continuar funcionando.
-- 3. O painel administrativo deve continuar funcionando.
-- 4. Checar tambem outras funcoes e URLs que possam expor dados.
-- 5. O bucket documentos-respostas deve estar privado, apos migracao.
--
-- ATENCAO: funcoes antigas podem ter dependencias em outros clientes.
-- Nao usar este arquivo sozinho como solucao completa.
