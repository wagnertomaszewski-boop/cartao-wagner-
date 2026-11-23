# Conferente independente — etapa de homologação (sem ativação)

**Escopo:** somente código da branch \`feature/recuperacao-whatsapp-manual\` e ensaios **sintéticos**. Não é um serviço operacional de validação de WhatsApp. Não implantar em produção.

## Separação de funções

1. O administrador do Painel, autenticado e com MFA recente, confere a identidade e aprova o pedido. Ele **não comprova sozinho** a posse de outro WhatsApp.
2. Um **verificador de posse independente** deve gerar e enviar um desafio específico ao NOVO número e confirmar sua resposta por um canal confiável. Somente após a confirmação, assina com **sua chave Ed25519 privada** um recibo contendo: pedido, solicitação, operador, número antigo, número novo, identificador único de evidência e horário. A função de envio/validação real desse desafio **ainda não existe** neste repositório.
3. Um **conferente externo separado** valida a assinatura e os vínculos do recibo. Apenas nessa condição, o módulo \`emitir-atestado-por-recibo.mjs\` gera um atestado Ed25519 de regularização, com a **segunda chave privada** (diferente da primeira).
4. A API candidata valida somente a **chave pública do conferente**, o ID do conferente, o pedido, o operador, os telefones e prazo de cinco minutos. Consulta o atestado **do servidor**, não do navegador. A evidência não pode ser reutilizada em outra regularização (índice UNIQUE previsto em \`contatos-legados-candidata.sql\`).
5. Só após as verificações o administrador pode gerar o código temporário e abrir o WhatsApp manualmente. O cadastro histórico \`public.solicitacoes.whatsapp\` **não é editado**.

## Fronteiras de segurança

- **Nunca** guardar chaves privadas em GitHub, aplicativo Android, navegador, Render da API, banco Supabase ou variáveis da API pública.
- O verificador de posse e o conferente devem ser independentes entre si e do operador da solicitação. Uma pessoa que tenha acesso apenas ao Painel não consegue fabricar um recibo válido.
- As confirmações do navegador \`identidadeConferida\` e \`contatoVerificado\` não substituem prova assinada.
- Nenhum atestado é aceito após cinco minutos, para outro pedido/operador/número, com assinatura trocada, com chave não autorizada ou conferente igual ao administrador.
- Não usar mensagens, códigos, documentos, números, PEMs ou evidências privadas em logs, commits ou relatórios.
- **Atenção:** assinatura válida significa que a autoridade que assinou declarou a verificação. A segurança real ainda depende da operação confiável do desafio independente; os testes sintéticos não provam posse de um WhatsApp verdadeiro.
- Evitar reuso da prova: a inserção da regularização deve continuar transacional e sujeita à unicidade de \`evidencia_id\`; a fonte externa deverá registrar revogação e trilha de auditoria.

## Situação de implantação

- O emissor de atestado existe apenas como **biblioteca testável**; não expõe endpoint de emissão e não recebe comprovantes diretamente do cidadão.
- Nenhuma chave privada foi criada ou configurada em serviço conectado.
- A fonte de dados \`mandato_privado.atestados_regularizacao\` está apenas **proposta** em \`../sql/atestados-regularizacao-NAO-EXECUTAR.sql\`. Nenhuma mudança de papel, permissão, banco ou bucket é autorizada por esta documentação.
- Sem \`MANDATO_CONFERENTE_ED25519_PUBLIC_KEY\` e \`MANDATO_CONFERENTES_EXTERNOS\` válidos, a API candidata **não habilita** regularização de contato legado; o Painel mostra o bloqueio.
- As demais rotas de recuperação por WhatsApp já aprovadas permanecem preservadas.

## Para concluir a etapa operacional, ainda será necessário

- Selecionar/implementar um provedor ou serviço independente de desafio de posse, com tratamento adequado dos dados pessoais e logs minimizados.
- Proteger as duas chaves privadas **fora** da API, com rotação, revogação e emissão auditável; definir a lista de verificadores independentes autorizados.
- Planejar quem armazena o atestado sem dar INSERT/UPDATE ao papel da API; realizar ensaio isolado com DDL/DML **após autorização específica**.
- Provar em Android físico, com número de teste autorizado, as transições: contato antigo → decisão administrativa → prova externa → emissão de código → WhatsApp manual → validação de uso único.
- Obter aceite explícito para qualquer alteração posterior em produção, Supabase, DNS, buckets, políticas ou aplicativo publicado.

## Testes de código

No diretório \`homologacao/api-neon\` com Node 22 e dependências de teste:
\`\`\`sh
node --test producao/tests/emissor-atestado-externo.test.mjs producao/tests/verificador-contato-independente.test.mjs producao/tests/integracao.test.mjs
\`\`\`

O CI também executa \`node --test producao/tests/*.test.mjs\` e verifica a entrada candidata com Deno, sem conectar ou alterar a produção.
