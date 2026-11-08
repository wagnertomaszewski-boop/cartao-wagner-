# Evidências de testes negativos no Neon — 08/11/2026

Escopo: projeto `proud-firefly-64745516`, esquema `mandato_testes`, função `registrar_decisao_sintetica_900007`, papel `mandato_api_homologacao`. Nenhuma alteração de produção.

## Teste 1 — identificadores fora do escopo

Chamada com protocolo, operador e registro inválidos. Resultado observado: SQLSTATE `P0001`, mensagem `Fora do escopo sintético`. Operação rejeitada.

## Teste 2 — reutilização da evidência

Chamada com os três identificadores sintéticos esperados (`LEGADO-EMISSAO-TESTE-900007`, `OP-TESTE-900007`, `REG-TESTE-900007`) depois do consumo anterior. Resultado observado: SQLSTATE `P0001`, mensagem `Evidência ausente ou já consumida`. Operação rejeitada.

## Verificação de estado

Consulta somente leitura anterior: uma evidência sintética, uma consumida, uma decisão de teste, uma decisão total. Consulta posterior ao teste 1: uma decisão total, uma evidência consumida. A função privada definitiva não está instalada. Não foi realizada nova gravação bem-sucedida.

## Limites da evidência

Esses testes não validam autenticação HTTP ponta a ponta, assinatura Ed25519 operacional, concorrência, nem migração de produção. A função sintética tem EXECUTE para `mandato_api_homologacao`, mas não para PUBLIC. Não habilitar a função privada definitiva sem comprovação independente da fonte de atestados e dos controles de escrita.
