# Execução local do fluxo automático — 2026-11-07

Arquivos consultados na branch `feature/recuperacao-whatsapp-manual`: `fluxo-recuperacao-automatico.mjs`, `fluxo-recuperacao-automatico.test.mjs`, `desafio-recuperacao.mjs`. Conteúdos transcritos em cópias locais, sem checkout verificável do repositório inteiro.

Ambiente: Node.js v22.16.0. Comando: `node --test /mnt/data/v2-flow-check/fluxo-recuperacao-automatico.test.mjs`.

Resultado TAP: `1..5`; `# tests 5`; `# pass 5`; `# fail 0`; `# duration_ms 175.328159`.

Cenários: dependências obrigatórias; resposta pública uniforme para protocolo inexistente e contato não verificado; envio fictício somente a contato verificado e confirmação interna vinculada ao pedido; invalidação quando envio falha; tratamento de erro na busca do contato.

**Limitações:** não foi realizado checkout integral nem execução contra Neon ou WhatsApp real. A confirmação interna não é endpoint HTTP, e não concede chave. Não há garantia de proteção contra enumeração por tempo de resposta. Persistência em memória e ausência de rate limit distribuído impedem produção. Nenhuma mudança foi publicada ou aplicada a dados reais.
