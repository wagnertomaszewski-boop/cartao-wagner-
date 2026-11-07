# Plano de implantação HTTPS — V2 (homologação)

Data: 2026-11-07. Escopo exclusivo: branch `feature/recuperacao-whatsapp-manual`, projeto Neon isolado `proud-firefly-64745516`. **Não autoriza produção.**

## Evidências e limites
- GitHub Actions `Homologacao HTTP Neon isolada` execução #4 foi exibida como aprovada pelo usuário: testes simulados, segredos e `Executar HTTP-Neon real` verdes.
- A alteração de interface do commit `cb8e08d4` esclarece que a recuperação é manual. O teste de interface foi incluído no workflow no commit `1619c33a`; **não há confirmação nesta revisão de que a execução posterior tenha passado**.
- O smoke HTTP real testa `/health`, CORS, corpo excessivo, consulta de protocolo fictício inexistente e exigência de bearer para rota admin. Não testa identidade real, entrega WhatsApp, migração nem uso de dados reais.

## Pré-requisitos de publicação de homologação
1. Selecionar host HTTPS gerenciado para Node 22 com TLS válido, logs redigidos, proteção contra abuso e política de custos aprovada. **Não hospedar PostgreSQL nem senha no GitHub Pages/frontend.**
2. Usar segredo de serviço exclusivo de homologação, rotacionado após exposição anterior, armazenado somente no provedor backend. Configurar `DATABASE_URL` sem parâmetros de SSL na URL; a aplicação exige `rejectUnauthorized:true`.
3. Variáveis de ambiente do serviço:
   - `MANDATO_AMBIENTE=homologacao`
   - `HABILITAR_API_NEON=sim`
   - `HABILITAR_ROTAS_CIDADAO_TESTES=sim` **somente durante testes com dados fictícios**
   - `NEON_USUARIO_SERVICO_HOMOLOGACAO=mandato_api_homologacao`
   - `NEON_HOST_HOMOLOGACAO=<hostname exato do Neon isolado>`
   - `DATABASE_URL=<segredo no backend>`
   - `ORIGEM_PAINEL_HOMOLOGACAO=https://wagnertomaszewski-boop.github.io` somente se a interface de homologação for servida nessa origem.
4. O serviço deve importar `iniciarHomologacao()`, chamar `servidor.listen(PORT,'0.0.0.0')` **somente no backend HTTPS confiável**, e executar `fechar()` no encerramento. O módulo atual não sobe automaticamente uma API remota; `server.mjs` standalone cria servidor sem operações Neon.
5. Testar GET `/health` pela URL HTTPS e os mesmos testes HTTP–Neon reais com protocolo fictício; exigir CORS de origem inválida 403, limite de corpo 413, admin sem bearer 401, consulta fictícia vazia, nenhuma credencial em logs.
6. Antes de conectar cidadãos reais: implementar limitação distribuída por IP confiável do proxy (atualmente é apenas `remoteAddress` em memória); verificar autorização ponta a ponta; revisar privacidade/LGPD e retenção; confirmar migração segura, chaves existentes, recuperação e eventual envio de WhatsApp (não implementado).
7. Só após esses gates e aprovação explícita: ativar `SEGURANCA_V2_ATIVA`, preencher `API_SEGURANCA_V2` com **origem HTTPS pública do backend**, desabilitar RPCs públicas legadas de forma coordenada e executar testes de regressão completos.

## Bloqueios atuais
- Nenhum host HTTPS de homologação selecionado ou implantado.
- Nenhuma evidência de teste ponta a ponta V2 -> HTTPS -> Neon.
- Fluxo administrativo de recuperação permanece deliberadamente desabilitado.
- Nenhuma autorização para migrar dados ou modificar produção neste plano.

## Critério de pronto
Somente considerar pronto para implantação pública com todos os gates anteriores aprovados, registro de resultados e rollback documentado.
