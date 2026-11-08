# Decisões de identidade — homologação isolada

## Estruturas instaladas
Projeto Neon isolado `proud-firefly-64745516`, banco `neondb`, esquema `mandato_testes`:
- `decisoes_identidade_homologacao`: decisões auditáveis com protocolo, referência de operador, flags de conferência, status, registro e horário. **Não armazenar documentos, CPF, fotografias ou tokens.**
- `consultar_decisao_identidade_privada(text,text)`: consulta apenas a decisão mais recente do par protocolo/operador nas últimas 24 horas, com `SECURITY DEFINER` e `search_path` fixo.
- Somente `mandato_api_homologacao` possui EXECUTE; `mandato_cidadao_a` e PUBLIC não possuem. A API não possui INSERT direto na tabela.

## Verificação realizada
A função foi chamada usando a conta de serviço e retornou zero linhas. Não há decisões gravadas. A consulta a permissões confirmou API EXECUTE=true, cidadão EXECUTE=false, API INSERT=false.

## Bloqueio intencional
**Não existe função de gravação de decisões disponível à API.** Nenhum operador pode registrar aprovação por essa integração neste momento. Uma decisão só poderá ser registrada após implementar fluxo administrativo autenticado, prova efetiva de identidade, autorização específica e auditoria imutável. Não é permitido tratar um checkbox do cliente como prova.

## Integração de código
`fonte-decisao-neon.mjs` consulta a RPC com parâmetros e falha fechada se ausente ou ambígua; `fluxo-com-decisao-persistida.mjs` integra ao emissor interno. Não existe endpoint público de emissão.

## Pendências para conclusão
1. Projetar registro seguro e imutável da decisão por operador autenticado, com verificação documental efetiva e auditoria; exigir aprovação para qualquer escrita no banco.
2. Testar ponta a ponta em homologação com identidade fictícia e operador de teste, usando a RPC instalada, sem acesso a dados reais.
3. Validar política de consumo único do comprovante e autorização por protocolo, revisar acesso aos RPCs legados e plano de migração.
4. Obter autorização separada antes de conectar credenciais reais, consultar dados de cidadãos ou modificar produção.

**Nenhum sistema público foi ativado.**
