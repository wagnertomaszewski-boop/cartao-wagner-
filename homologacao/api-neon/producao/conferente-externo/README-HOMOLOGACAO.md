# Conferente independente — etapa de homologação (sem ativação)

**Escopo:** somente código da branch `feature/recuperacao-whatsapp-manual` e ensaios **sintéticos**. Não é um serviço operacional de validação de WhatsApp. Não implantar em produção.

## Separação de funções

1. O administrador do Painel, autenticado e com MFA recente, confere a identidade e aprova o pedido. Ele **não comprova sozinho** a posse de outro WhatsApp.
2. Um **verificador de posse independente** deve gerar e enviar um desafio específico ao NOVO número e confirmar sua resposta por um canal confiável. Somente após a confirmação, assina com **sua chave Ed25519 privada** um recibo contendo: pedido, solicitação, operador, número antigo, número novo, identificador único de evidência e horário. Existe somente uma simulação de geração e conferência do desafio; o serviço de envio/validação **real** ainda não existe neste repositório.
3. Um **conferente externo separado** valida a assinatura e os vínculos do recibo. Apenas nessa condição, o módulo `emitir-atestado-por-recibo.mjs` gera um atestado Ed25519 de regularização, com a **segunda chave privada** (diferente da primeira).
4. A API candidata valida somente a **chave pública do conferente**, o ID do conferente, o pedido, o operador, os telefones e prazo de cinco minutos. Consulta o atestado **do servidor**, não do navegador. A evidência não pode ser reutilizada em outra regularização (índice UNIQUE previsto em `contatos-legados-candidata.sql`).
5. Só após as verificações o administrador pode gerar o código temporário e abrir o WhatsApp manualmente. O cadastro histórico `public.solicitacoes.whatsapp` **não é editado**.

## Fronteiras de segurança

- **Nunca** guardar chaves privadas em GitHub, aplicativo Android, navegador, Render da API, banco Supabase ou variáveis da API pública.
- O verificador de posse e o conferente devem ser independentes entre si e do operador da solicitação. Uma pessoa que tenha acesso apenas ao Painel não consegue fabricar um recibo válido.
- As confirmações do navegador `identidadeConferida` e `contatoVerificado` não substituem prova assinada.
- Nenhum atestado é aceito após cinco minutos, para outro pedido/operador/número, com assinatura trocada, com chave não autorizada ou conferente igual ao administrador.
- Não usar mensagens, códigos, documentos, números, PEMs ou evidências privadas em logs, commits ou relatórios.
- **Atenção:** assinatura válida significa que a autoridade que assinou declarou a verificação. A segurança real ainda depende da operação confiável do desafio independente; os testes sintéticos não provam posse de um WhatsApp verdadeiro.
- Evitar reuso da prova: a inserção da regularização deve continuar transacional e sujeita à unicidade de `evidencia_id`; a fonte externa deverá registrar revogação e trilha de auditoria.

## Novo protótipo de desafio independente (somente simulação)

- `verificador-posse-por-desafio.mjs`: inicia um desafio de seis dígitos, válido por cinco minutos. O código vai **somente** ao transporte privado injetado; a resposta ao administrador contém apenas um identificador e vencimento. No armazenamento permanece HMAC, sem o código puro. Cinco erros encerram as tentativas.
- A função de autorização inicial é obrigatoriamente injetada pelo serviço independente e **precisa comprovar no servidor** o operador autenticado com MFA recente, o pedido aprovado e o vínculo do telefone. Não usar nenhum valor ou confirmação fornecida diretamente pelo navegador para isso.
- A confirmação correta consome atomicamente o desafio, assina um **recibo de posse Ed25519** e o envia a uma função privada de registro. O recibo não é devolvido ao navegador. O conferente separado continua validando esse recibo antes de emitir o atestado final.
- `persistencia-posse-postgres.mjs`: adaptador transacional para PostgreSQL independente; limita a três desafios por número em uma hora, não permite mais de um desafio por pedido e exige consumo único. Requer uma role e um banco próprios, ainda **não configurados**.
- `sql/laboratorio-desafios-posse-NAO-EXECUTAR.sql`: esquema descartável para a suíte PGlite. Não executar no Supabase ou Neon. Não contém credenciais, permissões de API ou migrações produtivas.
- Os testes usam uma caixa de saída fictícia em memória no lugar do WhatsApp. Portanto, comprovam o comportamento do software, **não** a entrega a um aparelho nem a posse verdadeira do número.
- Para o funcionamento real falta uma integração com provedor de envio/validação e um serviço externo com credenciais, isolamento, autenticação, auditoria, rotação de chaves, limpeza e retenção. Não existe endpoint público habilitado aqui.

## Transporte WhatsApp oficial (adaptador preparado; não ativado)

Foi acrescentado `transporte-whatsapp-twilio-verify.mjs` como opção de entrega real por **Twilio Verify, canal WhatsApp**. O serviço de verificação gera o código local, protege-o por HMAC e usa `CustomCode` para solicitar ao provedor o envio do mesmo código, sem expô-lo ao navegador. O adaptador exige resposta de solicitação `pending`, número e canal corretos; isso **não equivale à confirmação de entrega**. A posse só é confirmada quando o código válido é informado ao verificador externo, dentro de cinco minutos, com consumo único.

**Pré-verificação antes do envio:** o adaptador chama o endpoint oficial **GET** do próprio Verify Service (`verificar-preparacao-twilio-verify.mjs`) antes de qualquer POST que possa gerar custo. Só permite a tentativa se `custom_code_enabled` for `true` e houver `whatsapp.msg_service_sid` e `whatsapp.from` válidos. Qualquer erro de rede, falta de permissão ou configuração incompleta interrompe a operação sem tentar enviar. A consulta é somente leitura e não é um teste de entrega real.

Pré-requisitos externos **não disponíveis no repositório**:
- Conta Twilio ativa, Verify Service `VA...`, API Key `SK...` e API Secret guardados somente no serviço externo;
- Em **Verify > Services > General**, habilitar **Custom Verification Code**;
- Número remetente WhatsApp Business registrado/liberado para o canal Verify e verificações permitidas para o destino;
- Revisar eventuais cobranças por verificação/mensagem, limites, conformidade e consentimento; em conta Trial, confirmar restrições;
- Hospedar o verificador em infraestrutura realmente independente, com autenticação forte, permissões limitadas, persistência privada, auditoria e política de retenção. **Não copiar segredos para a API de homologação Render.**
- Executar um teste em celular cujo dono tenha autorizado a mensagem. **Nenhum envio real foi realizado.**

Referências oficiais para configuração:
- https://www.twilio.com/docs/verify/whatsapp
- https://www.twilio.com/docs/verify/api/customization-options

O envio é opcional e desativado até existir configuração segura, consentimento e autorização específica para testes. O caminho histórico de envio manual do código de recuperação permanece separado e preservado.

## Situação de implantação

- O emissor de atestado e o verificador de posse existem apenas como **bibliotecas testáveis**; não expõem endpoints e não recebem mensagens diretamente de cidadãos.
- Nenhuma chave privada foi criada ou configurada em serviço conectado.
- A fonte de dados `mandato_privado.atestados_regularizacao` está apenas **proposta** em `../sql/atestados-regularizacao-NAO-EXECUTAR.sql`. Nenhuma mudança de papel, permissão, banco ou bucket é autorizada por esta documentação.
- Sem `MANDATO_CONFERENTE_ED25519_PUBLIC_KEY` e `MANDATO_CONFERENTES_EXTERNOS` válidos, a API candidata **não habilita** regularização de contato legado; o Painel mostra o bloqueio.
- As demais rotas de recuperação por WhatsApp já aprovadas permanecem preservadas.

## Para concluir a etapa operacional, ainda será necessário

- Selecionar/implementar um provedor ou serviço independente de desafio de posse, com tratamento adequado dos dados pessoais e logs minimizados.
- Proteger as duas chaves privadas **fora** da API, com rotação, revogação e emissão auditável; definir a lista de verificadores independentes autorizados.
- Planejar quem armazena o atestado sem dar INSERT/UPDATE ao papel da API; realizar ensaio isolado com DDL/DML **após autorização específica**.
- Provar em Android físico, com número de teste autorizado, as transições: contato antigo → decisão administrativa → prova externa → emissão de código → WhatsApp manual → validação de uso único.
- Obter aceite explícito para qualquer alteração posterior em produção, Supabase, DNS, buckets, políticas ou aplicativo publicado.

## Testes de código

No diretório `homologacao/api-neon` com Node 22 e dependências de teste:
```sh
node --test producao/tests/emissor-atestado-externo.test.mjs producao/tests/verificador-contato-independente.test.mjs producao/tests/integracao.test.mjs
```

O CI também executa `node --test producao/tests/*.test.mjs` e verifica a entrada candidata com Deno, sem conectar ou alterar a produção.
