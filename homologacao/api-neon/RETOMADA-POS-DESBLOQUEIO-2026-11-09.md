# Retomada verificável após desbloqueio do GitHub — 09/11/2026

Conferência às 18h de Brasília. Escopo: repositório `wagnertomaszewski-boop/cartao-wagner-`, branch `feature/recuperacao-whatsapp-manual`, Render `mandato-neon-homologacao`, Neon `proud-firefly-64745516 / br-lively-snow-bev5ecau / neondb`. Produção e aplicativos publicados não foram modificados.

## Estado recuperado e 404

- Branch autorizada recuperada em `ebbe06c0b8fc79d082a20c623cb7fbcd5ea1d408`. Alterações da execução interrompida estavam efetivamente salvas no GitHub; não houve reinício.
- Branch main observada: `dc1c24400a57c408d8d2f93c7f96fefee83e0056`.
- V2 pública, raiz do site, `/painel/index.html` e `/v2/solicitacao.html`: HTTP 200.
- Conferência visual da V2: identidade aprovada, navegação, lista de 13 registros públicos e detalhe completo de Diploma Aluno Nota Dez (objetivo, situação, realizado, próximos passos e linha do tempo).
- Painel público: formulário de login disponível. Área administrativa de produção não autenticada nesta rodada.
- Não foi necessária correção ou reimplantação do GitHub Pages. O 404 anterior não se reproduziu. Os logs históricos de checkout demonstram `Repository not found` durante o bloqueio, mas não provam isoladamente a causa do 404 de cada dispositivo.
- O aplicativo instalado via Play Store não foi testado fisicamente. Disponibilidade web não equivale à validação completa desse APK.

## Falhas identificadas e correção

1. Execuções de 12:25 UTC pararam no checkout com erro 128/Repository not found; nenhum teste nem compilação chegou a executar.
2. Após desbloqueio, retomado somente o workflow que reúne API, HTTP/MFA e telas, evitando repetir os dois workflows equivalentes.
3. APK compilou, mas verificação pós-compilação falhou por ausência de `rg` no runner.
4. Commit `8523b4e6158e5bca448594b689e7a2b445610a3d`: única alteração em `.github/workflows/painel-v17-apk.yml`, substituindo descoberta de manifestos por `Path.rglob` da biblioteca padrão. Nenhuma mudança funcional no APK nem no código público.
5. Nova execução do APK concluída com sucesso. Conferiu applicationId de homologação, debuggable, localização somente debug e ausência dessa permissão nos manifestos release. Nada foi publicado na Play Store.

## Render e Neon

- Tentativa histórica `dep-dbornelg1s2s738sv3bg`: build_failed; permaneceu ativa a versão `e426b5a`.
- Reimplantação controlada do mesmo commit `ebbe06c`: `dep-dbp3ump42hec73bgdqmg`, **live**, concluída em 09/11 às 18:47:46 de Brasília.
- Estado real: recuperação manual versão 3; marcadores Neon de modelo, atendimento e mídia presentes. Cloud API WhatsApp desativada; envio manual mantido.
- API sem sessão: pedidos de recuperação, catálogo de solicitações, conteúdos e dashboard retornaram 401. Rota administrativa legada retornou 410. Health 200 em homologação com rotas cidadãs legadas desabilitadas.
- Oito registros originais sem modelo mantêm MD5 agregado `13ac120e03191b46cece26747562776a`, igual ao checkpoint anterior.
- Auditoria persistida: 10 aprovações, 1 rejeição, 10 emissões, 7 validações, 3 bloqueios de reutilização e 1 expiração. Contagens são eventos históricos de homologação, não testes únicos nem prova de entrega pelo WhatsApp.
- Um marcador novo de mídia foi executado uma vez; não foram repetidos os ensaios antigos de emissão de códigos.

## Testes e evidências

| Execução | Aprovados | Falhos | Ignorados |
|---|---:|---:|---:|
| npm test (API/segurança/modelos/arquivos) | 462 | 0 | 2 |
| npm run test:hml (autenticação/MFA/HTTP) | 6 | 0 | 0 |
| Telas V2/Painel | 33 | 0 | 0 |
| Verificações HTTP reais após implantação (health, permissões, legado, tela) | 7 | 0 | 0 |
| Protocolo fictício existente: chave ausente/incorreta | 2 | 0 | 0 |

Não somar como testes únicos: há sobreposição entre as suítes. Os dois ignorados são integrações externas legadas dependentes de fixtures/configuração própria; não contam como aprovação.

- Workflow completo: https://github.com/wagnertomaszewski-boop/cartao-wagner-/actions/runs/42616898496 (nova tentativa, success).
- APK corrigido: https://github.com/wagnertomaszewski-boop/cartao-wagner-/actions/runs/42705844838 (success).
- Os workflows duplicados antigos continuam com falha histórica de checkout; não foram reexecutados para aumentar contagens.
- Consulta HTTP do protocolo fictício existente `2026-900004`: chave ausente e chave incorreta retornaram apenas `encontrado=false`, sem dados privados.
- Teste real pela interface: criada exclusivamente a solicitação fictícia `2026-900012`; protocolo e chave válidos abriram histórico/status. QR gerado continua exigindo chave, sem incorporá-la ao endereço. A chave não foi registrada neste relatório nem no repositório.
- O script Node de smoke excedeu o limite local de 60 segundos sem resultados. Não foi contado como aprovado; as sete verificações HTTP e duas consultas negativas foram executadas separadamente com cliente HTTP e passaram.
- Aprovação administrativa interativa não foi repetida: a sessão atual está desautenticada e exige login/MFA do proprietário para nova conferência visual. A suíte isolada testa login, MFA e permissões com credenciais fictícias.

## Pendências reais

- Teste físico do APK: instalação, câmera/seletor, localização autorizada/negada, arquivos, login e navegação. Roteiro em `ROTEIRO-ANDROID-FISICO-HML-2026-11-09.md`. O APK gerado é do Painel de homologação, não uma atualização do Mandato em Ação publicado.
- Conferência visual autenticada do catálogo, fiscalização e editor, mediante login/MFA recente do proprietário.
- Backup completo independente de produção, incluindo Storage/anexos, com restauração validada. O backup já ensaiado cobre modelos fictícios e auditoria; não equivale a backup integral de produção.
- Adaptador de formatos antigos está ensaiado com dados fictícios; nenhuma migração de cidadãos foi executada.
- Bloqueio das RPCs antigas de produção ainda depende da migração autorizada, compatibilidade, recuperação e backup. A proteção comprovada nesta rodada é da homologação; não afirmar que toda produção já exige chave.
- Validação física dos aplicativos publicados e preparação da distribuição somente após aceite. Nenhuma alteração no Supabase de produção, dados reais ou Play Store.
