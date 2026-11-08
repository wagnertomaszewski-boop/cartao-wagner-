# Autenticação administrativa isolada — 08/11/2026

Escopo: branch Git `feature/recuperacao-whatsapp-manual`, serviço Render `mandato-neon-homologacao`, projeto Neon `mandato-em-acao-testes`, branch `homologacao-fiscalizacao-20261108` (`br-lively-snow-bev5ecau`). Não altera os aplicativos publicados nem o Supabase de produção.

## Implementação

- Console separado `/hml/`, hospedado no próprio serviço Render, sem carregar o painel de produção.
- Better Auth 1.7.18, senha + TOTP; cadastro público, métodos alternativos de entrada e dispensa de MFA por dispositivo não expostos.
- Usuários, contas, sessões, rate limiting e operações fictícias no schema `auth_admin_hml`. Papel de conexão `mandato_auth_hml`, sem acesso ao schema `mandato_testes`, sem CREATE em `public` e sem UPDATE/DELETE/TRUNCATE na auditoria.
- Cookies HttpOnly, Secure, SameSite=Strict; proteção de origem, CSP, respostas sem cache e limites persistentes. Tokens de sessão não devolvidos ao JavaScript.
- Cada operação administrativa exige confirmação MFA feita pelo servidor para aquela sessão nos últimos cinco minutos. Aprovação, confirmação WhatsApp, substituição da chave e auditoria são persistidas; a troca de chave ocorre na mesma transação que seu evento de auditoria.
- Apenas protocolos fictícios com prefixo `HML-`. O código WhatsApp é vinculado ao desafio, expira em cinco minutos, permite cinco tentativas e não pode ser reutilizado. Chaves e códigos não são gravados em texto claro ou logs.
- Quando o modo isolado está ativo, as rotas administrativas legadas `/api/admin/` retornam 410, sem consultar o Supabase. A consulta legada restrita de testes continua independente.

## Configuração privada no Render

`AUTH_HML_ATIVA=sim`, `AUTH_HML_ORIGIN`, `AUTH_HML_DATABASE_URL`, `AUTH_HML_SECRET`, `AUTH_HML_BOOTSTRAP_TOKEN`, `AUTH_HML_ADMIN_EMAIL`. Valores secretos apenas nas variáveis do serviço, não neste repositório. A conta é autorizada exclusivamente para o e-mail administrativo configurado.

A primeira instalação exige o código `AUTH_HML_BOOTSTRAP_TOKEN` e uma nova senha escolhida pelo titular no formulário `/hml/`. A instalação é consumida uma vez, sob bloqueio transacional. O titular faz o cadastro do autenticador e confirma o TOTP no navegador; o agente não escolhe nem recebe sua senha.

WhatsApp oficial exige variáveis exclusivas de testes: `WHATSAPP_HML_TOKEN`, `WHATSAPP_HML_PHONE_NUMBER_ID`, `WHATSAPP_HML_TEMPLATE`, `WHATSAPP_HML_DESTINO_TESTE`. Não usar número de cidadão ou credenciais de produção. Sem configuração, o envio falha fechado com 503. Aceite do provedor não é tratado como entrega: a posse do código deve ser confirmada pelo destinatário.

## Verificações executadas antes do deploy

- `npm test`: 426 testes, 424 aprovados, zero falhas, dois ignorados legados (opt-in de integração Neon real).
- `npm run test:hml`: seis testes aprovados. Autenticação real pela biblioteca, inclusive TOTP; teste HTTP com PostgreSQL em WASM; aprovação e auditoria; rejeição por origem, ausência/expiração de MFA, códigos incorretos/expirados/reutilizados, limite de tentativas, falha de transporte e invalidação da chave antiga.
- O transporte WhatsApp nos testes automatizados é fictício. Não é evidência de entrega pela Meta.
- Permissões reais do papel Neon conferidas via SQL; sem leitura do schema legado e sem alteração da auditoria.
- Auditoria npm de dependências de execução: zero vulnerabilidades conhecidas no momento da checagem.

## Pendências humanas e externas

A instalação da conta do titular e o MFA humano no navegador ainda precisam ser concluídos. Entrega real por WhatsApp depende da configuração de provedor/número de teste e recebimento do código. Os testes automatizados não comprovam essas duas etapas. Este console valida o fluxo isolado; ele não ativa a segurança nos aplicativos publicados.

## Contenção

Desativar `AUTH_HML_ATIVA` retira as novas rotas na próxima implantação sem apagar dados ou restaurar bancos. A migração é aditiva, não substitui tabelas existentes; nenhuma reversão destrutiva é necessária.
