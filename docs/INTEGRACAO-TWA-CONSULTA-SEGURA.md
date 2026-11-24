# Integração da consulta segura com o aplicativo Android (TWA)

**Estado:** código candidato, não publicado em main. Não liberar consulta de produção sem autorização específica.

## Como chega ao aplicativo
O arquivo Android Wagner.aab utiliza Trusted Web Activity e abre o site
https://wagnertomaszewski-boop.github.io/cartao-wagner-/.
A página Acompanhar sua solicitação leva a /acompanhar.html.
Por isso, melhorias web nessa URL podem chegar ao aplicativo instalado sem novo AAB,
quando não houver mudanças em recursos Android nativos.

## Código preparado nesta branch
- acompanhar.html: tela que exige protocolo e chave, com primeiro acesso/recuperação,
  confirmação de código, histórico, mensagens e documentos privados.
- seguranca/consulta-app-cliente.mjs: cliente para API HTTPS privada, POST JSON,
  sem cookies, sem tokens em URL e sem RPCs legadas.
- seguranca/consulta-app-ui.mjs: segredos somente em memória; sem armazenamento
  local de chaves; sem renderizar links públicos para anexos.
- seguranca/config-consulta-publica.json: ativo=false e apiBase vazia.
- v2/index.html e v2/acompanhar.html: link para a mesma tela segura.
- testes/consulta-app.test.mjs: testes isolados sem Supabase real ou WhatsApp.

## Estado do banco real consultado em 24/11/2026 (somente leitura)
- 44 solicitações, 3 sem protocolo.
- Nenhuma chave individual ativa.
- Papel restrito mandato_api_privada ainda não criado.
- Bucket documentos-respostas privado.
- RPCs antigas de consulta por protocolo isolado revogadas na contenção anterior.
- A nova página é candidata: ainda não há autorização cidadã completa no backend produtivo.

## Sequência de liberação
1. Confirmar backup recuperável do banco e objetos Storage.
2. Resolver os 3 protocolos ausentes com conferência administrativa e auditoria;
   não associar chaves ao cidadão errado nem gerar chaves em lote sem identidade.
3. Criar papel restrito e API HTTPS privada com limitação de tentativas, validação de
   entrada e respostas sem dados pessoais antes da verificação.
4. Testar protocolos antigos/novos, chaves válidas e inválidas, históricos, respostas,
   anexos e proibição de consulta cruzada.
5. Testar primeiro acesso por código WhatsApp manual com administrador e MFA recente;
   não completar automaticamente contato legado com oito dígitos.
6. Verificar num Android físico o retorno do WhatsApp e a persistência temporária
   do recibo somente na memória da tela.
7. Após autorização específica de publicação, revisar e integrar este pull request
   em main e ativar configuração pública com API de produção verificada.
8. Verificar que RPCs legadas continuam bloqueadas e documentos privados. Em erro,
   desativar a nova integração sem reabrir a exposição antiga.

A homologação usa dados fictícios. Não configurar a API de homologação como se fosse
produção. Nunca colocar service_role, JWT, senhas, keystore ou contatos particulares
nos arquivos públicos.
