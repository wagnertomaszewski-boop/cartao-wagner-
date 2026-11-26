# Aceite final e implantação do Mandato

## Evidências de homologação

- HML-CANDIDATA-000011. O responsável confirmou no celular o envio de foto, consulta, download privado, localização no Painel e abertura no Google Maps. A recuperação manual da chave pelo WhatsApp já havia sido aprovada.
- HML-CANDIDATA-000008. Registro existente, GPS gravado, verificador v1 ativo e nenhuma consulta aceita ou foto vinculada na conferência. A causa da rejeição permanece indeterminada. Manter registro e trilha de auditoria. Se o titular precisar de acesso, usar o fluxo regular de recuperação, com MFA e verificação de identidade.
- O backup de 59 objetos foi restaurado isoladamente, com zero divergências de caminho e SHA-256. Preserve os arquivos e o manifesto. O backup do PostgreSQL é separado.

## Backup do banco e condição para implantação

Preserve o dump histórico de 20/11. Gere uma exportação nova com a ferramenta oficial e uma conexão autorizada. Guarde o artefato em diretório privado e calcule o SHA-256. Restaure em PostgreSQL local ou em um projeto privado dedicado, isolado da produção e da homologação acessível ao celular. Confira as 44 solicitações, relacionamentos com histórico e respostas, metadados dos anexos, permissões e funções necessárias. Documente o escopo do backup de Auth e a recuperação controlada de administradores e MFA. Preserve o ponto de reversão e registre o resultado antes de liberar a produção.

## Sequência após autorização

1. Fixar o SHA aprovado, guardar o estado das versões e configurar os artefatos conforme [implantação da API privada](implantacao-mandato-api-privada.md). Conferir o limite efetivo do bucket e da função, com arquivo fictício de tamanho máximo e credencial nomeada. O upload padrão do Supabase é viável para mais de 6 MB, mas o fornecedor recomenda transferência retomável nesse intervalo em redes instáveis. A candidata permite reenvio por arquivo e mantém a vinculação idempotente.
2. Validar em infraestrutura isolada a API, os clientes candidatos e a compatibilidade dos fluxos que permanecem na aplicação atual. No Mandato em Ação e V2, conferir envio sequencial, consulta e download por chave. No Painel, conferir recuperação sob MFA e o mapa. QR, biometria e confirmação de leitura do V2 permanecem no modo anterior e exigem decisão explícita de convivência antes da troca definitiva.
3. Em janela autorizada, implantar a API privada, checar versão, MFA, anexos e recuperação em amostras sintéticas e só então trocar os clientes. Conferir inventário das solicitações e dos anexos e manter a faixa fechada da Play Store intacta.
4. Acionar reversão se houver falha de autorização, anexos inacessíveis, divergência de inventário ou falha generalizada de upload. Restaurar o par web/API anterior compatível com chave, MFA e Storage privado. Se não houver par seguro, suspender temporariamente o fluxo afetado. Preservar novos registros, chaves e auditoria. Qualquer restauração efetiva de dados requer autorização separada.
