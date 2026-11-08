# Próximo teste de emissão integral — somente Neon isolado

**Estado:** aguardando autorização específica para gravar novo registro fictício.
**Projeto:** proud-firefly-64745516; banco neondb; schema mandato_testes.
**Branch GitHub:** feature/recuperacao-whatsapp-manual.

## Bloqueios técnicos identificados
1. As RPCs existentes aceitam apenas IDs fictícios 900004 e 900005, ambos já utilizados.
2. O adaptador criarPersistenciaRpcFicticia também fixa exatamente esses dois IDs.
3. O adaptador criarBuscaVinculoSupabase ainda requer uma fonte privada de consulta independente; não há integração de produção.
4. O comprovante HMAC exige verificação independente anterior. O campo identidadeConferida não pode vir de requisição do cidadão.
5. A aprovação manual precisa estar registrada no Neon nos últimos 24 horas.
6. O emissor atual audita a tentativa antes da persistência; a emissão concluída deve permanecer auditada atomicamente na RPC.

## Execução controlada proposta (NÃO EXECUTAR sem autorização)
- Reservar ID 900006 e protocolo LEGADO-EMISSAO-TESTE-900006, exclusivamente fictícios.
- Conferir previamente que ID, protocolo, chave e aprovação não existem.
- Criar somente a solicitação sintética e aprovação manual sintética necessárias, sem dados pessoais.
- Criar RPC de teste fixa para esse ID, com SECURITY DEFINER, search_path fixo, aprovação recente, bloqueio transacional, prevenção de duplicatas e auditoria atômica.
- Conceder EXECUTE somente à conta mandato_api_homologacao, sem INSERT direto e sem acesso de cidadão.
- Ajustar allowlist do adaptador somente para esse registro fictício.
- Executar o emissor Node com comprovante HMAC sintético emitido por verificador privado de teste, vínculo sintético independente e consulta real à aprovação/RPC Neon.
- Verificar uma única chave válida, consulta segura, auditoria e rejeição de segunda emissão.
- Conferir rollback e privilégios. Não ativar rotas públicas nem tocar Supabase real.

## Critério de sucesso
A chave só é retornada após confirmação da RPC real; uma segunda emissão é negada;
nenhum papel público obtém permissão; não há alteração de dados reais.

**Importante:** este teste não prova identidade real e não autoriza ativação em produção.
