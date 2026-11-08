# Plano de migração da consulta de protocolos — V2

**Estado:** preparação e testes; NÃO autorizado para produção.

## Situação confirmada
- A V2 pública ainda usa a RPC `consulta_publica_protocolo` no Supabase, com consulta por protocolo.
- A nova API HTTPS usa `consulta_segura` no Neon isolado, com protocolo e chave secreta.
- O banco `mandato_testes` contém apenas dados de homologação. A consulta nova NÃO alcança automaticamente os registros reais do Supabase.
- A flag `SEGURANCA_V2_ATIVA=false` e a URL vazia devem permanecer assim até a migração aprovada.
- Recuperação é manual, sem promessa de envio automático de chave.

## Bloqueadores antes de qualquer ativação
1. Inventariar as tabelas e políticas reais do Supabase de produção, em leitura apenas, sem exportar nomes, contatos, mensagens ou anexos para homologação.
2. Definir como os cidadãos com protocolos antigos receberão uma chave forte, após verificação de identidade. Não inventar ou divulgar chaves em páginas públicas.
3. Projetar a API segura sobre o banco de produção **apenas após autorização específica**, com papéis mínimos, auditoria, limites distribuídos e configuração de segredos exclusiva.
4. Verificar o impacto da RPC legada: ela deve ser restringida ou substituída para impedir consultas sem chave; não desligá-la abruptamente sem uma alternativa para os protocolos existentes.
5. Testar histórico, respostas, anexos e recuperação com dados sintéticos, e garantir que anexos privados não exponham caminhos internos.
6. Preparar comunicação ao cidadão, plano de reversão e acompanhamento de erros sem registrar chaves ou dados pessoais.
7. Executar testes finais de autenticação administrativa, permissões, CORS, tráfego, disponibilidade e privacidade antes de habilitar qualquer rota pública.

## Estratégia de transição proposta
- **Fase A:** testes isolados, sem mudar produção (estado atual).
- **Fase B:** inventário somente leitura do Supabase real e desenho do mecanismo de emissão de chaves; exige avaliação e aprovação.
- **Fase C:** migração controlada e compatibilidade com protocolos antigos, com acesso verificado e sem divulgação de dados; exige autorização explícita para operações em produção.
- **Fase D:** implantação gradual com monitoramento e reversão; ativar a flag somente após critérios de segurança atendidos.

## Critérios de aceite
- Protocolo sozinho não revela dados pessoais.
- Chave correta permite consultar apenas a própria solicitação.
- Chave errada, revogada ou ausente não retorna detalhes.
- Pedido de recuperação não revela se o protocolo/WhatsApp existem e não cria duplicatas.
- Administrador precisa de autenticação e autorização verificadas no servidor.
- O cidadão com protocolo anterior tem caminho de acesso comprovado.
- A API antiga não permanece como caminho de contorno à autenticação nova.
- O rollback não restaura acesso público indevido.

**Importante:** a aprovação de testes de homologação não equivale à autorização de implantação em produção.
