-- Checkpoint lógico parcial, só modelos fictícios. Não substitui backup externo.
-- Executar apenas na branch br-lively-snow-bev5ecau. Nenhuma tabela de origem muda.
-- Nomes fixos e CREATE sem IF NOT EXISTS nas tabelas impedem sobrescrita/reexecução.
BEGIN;
CREATE SCHEMA IF NOT EXISTS ensaio_restauracao_hml;
REVOKE ALL ON SCHEMA ensaio_restauracao_hml FROM PUBLIC;
CREATE TABLE ensaio_restauracao_hml.backup_modelo_20261109 AS
 SELECT id,protocolo,protocolo_publico,chave_hash,versao,dados_solicitacao
 FROM auth_admin_hml.pedidos
 WHERE dados_solicitacao IS NOT NULL AND telefone_cadastrado='+5551000000000';
CREATE TABLE ensaio_restauracao_hml.backup_auditoria_20261109 AS
 SELECT id,evento,usuario_id,pedido_id,criado_em FROM auth_admin_hml.auditoria
 WHERE pedido_id IN(SELECT id FROM ensaio_restauracao_hml.backup_modelo_20261109)
 OR pedido_id IN(SELECT id FROM auth_admin_hml.recuperacoes_manuais WHERE solicitacao_id IN(SELECT id FROM ensaio_restauracao_hml.backup_modelo_20261109));
CREATE TABLE ensaio_restauracao_hml.restaurado_modelo_20261109 AS TABLE ensaio_restauracao_hml.backup_modelo_20261109;
CREATE TABLE ensaio_restauracao_hml.restaurado_auditoria_20261109 AS TABLE ensaio_restauracao_hml.backup_auditoria_20261109;
COMMIT;
