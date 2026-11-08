# Bloqueios de ativação da gravação privada — 08/11/2026

## Situação verificada no Neon isolado
- `mandato_testes.decisoes_identidade_homologacao`: zero decisões.
- Existe índice de unicidade para `registro_id`.
- `mandato_api_homologacao` não possui INSERT direto.
- A função `registrar_decisao_identidade_privada(...)` **não está instalada**.

## Atenção: proposta SQL anterior não deve ser instalada como está
A proposta `PROPOSTA-REGISTRO-DECISAO-PRIVADA.sql` recebe booleanos
`p_identidade_verificada` e `p_evidencia_conferida`. Um chamador que
obtenha EXECUTE poderia enviar `true,true` sem prova. Validação apenas
no aplicativo não é suficiente para defender a função contra chamadas
diretas. **Não conceder EXECUTE à API nesta forma.**

## Requisitos antes de ativar
1. Definir quem pode assinar a conferência; manter a chave privada do
   conferente fora do servidor de emissão e da aplicação pública.
2. Fonte de atestados confiável, com autorização de leitura, trilha de
   auditoria e vínculo ao protocolo e ao operador.
3. Validar assinatura Ed25519, validade, identidade do conferente e
   separação de funções no servidor.
4. A função de escrita deve verificar uma prova não falsificável no
   banco, ou usar um papel exclusivamente de escrita inacessível à
   API pública, com autorização vinculada e trilha de auditoria.
5. Consumir `registro_id` uma única vez, de modo transacional,
   garantindo que decisões repetidas ou concorrentes não sejam aceitas.
6. Testar o fluxo real ponta a ponta apenas com dados sintéticos no
   Neon isolado, mediante autorização explícita para DDL/DML.

**Estado:** testes automatizados com mocks aprovados até #225;
integração com fonte operacional e escrita real ainda pendentes.
Nenhuma alteração em produção foi autorizada.
