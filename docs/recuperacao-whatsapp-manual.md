# Recuperação manual de chave — especificação de integração (rascunho)

**Status:** somente branch de desenvolvimento. Não ativar no app publicado.

## Arquivos identificados
- `v2/index.html`: formulário de solicitação e consulta pública.
- `admin.html`: painel administrativo com autenticação Supabase.
- `painel-mandato-wagner/index.html` (outro repositório): iframe para `../cartao-wagner-/admin.html`.

## Fluxo aprovado
1. Cidadão informa protocolo e WhatsApp já cadastrado.
2. Backend responde genericamente, sem confirmar existência do protocolo.
3. Backend cria no máximo um pedido pendente e limita novos pedidos por 24 horas.
4. Administrador autenticado visualiza pedidos pendentes, confirma identidade fora do sistema e aprova ou recusa.
5. Em caso de aprovação, backend gera segredo aleatório novo, armazena apenas hash e invalida segredo anterior.
6. A chave nova deve ser exibida uma única vez ao administrador autenticado, com opção de copiar e enviar manualmente ao WhatsApp correto; nunca gravar chave em log ou banco em texto claro.

## Contrato de backend necessário (Supabase de produção)
- RPC pública para solicitar recuperação: argumentos `p_protocolo`, `p_whatsapp`; resposta genérica.
- RPC administrativa autenticada para listar pedidos pendentes; acesso exclusivamente ao administrador.
- RPC administrativa autenticada para decidir pedido; exige verificação de autorização do usuário **dentro da função** e retorna a nova chave somente na aprovação.
- Proteção contra tentativas excessivas por origem no gateway/Edge Function; evitar funções SECURITY DEFINER que confiem em identificadores de usuário fornecidos pelo cliente.
- Migrar a consulta atual que usa somente protocolo sequencial para protocolo + segredo antes de ativar a recuperação.
- Fazer backup, testes de compatibilidade, política de dados e validação de segurança antes da implantação.

## Testes no Neon (não produção)
- Pedido com WhatsApp correto: aprovado.
- Repetição enquanto pendente: não duplica.
- Recusa: chave antiga permanece válida.
- Aprovação: nova chave gerada e anterior invalidada.
- Pedido após recusa em menos de 24h: não duplica.
- Cidadão não possui permissão de executar a função de decisão.

## Não fazer
- Não copiar as funções do Neon diretamente para Supabase: papéis de teste não correspondem ao Auth real.
- Não expor nova chave em respostas públicas, URL, armazenamento local persistente ou histórico.
- Não colocar serviço de WhatsApp automático pago sem autorização.
- Não publicar mudança visual antes de implantar e validar backend.
