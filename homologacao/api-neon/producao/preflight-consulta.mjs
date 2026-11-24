// Porta de liberação da consulta privada. Sem conexão com banco, sem PII e sem mutações.
// FALHA FECHADA: ausência de qualquer evidência/aceite impede publicação.
const inteiro=v=>Number.isSafeInteger(v)&&v>=0;
export function avaliarProntidaoConsulta(inventario={},validacoes={}){
 const campos=['totalSolicitacoes','semProtocolo','protocolosDuplicados','chavesAtivas','funcoesLegadasPublicas'];
 if(campos.some(k=>!inteiro(inventario[k])))throw Error('Inventário incompleto ou inválido; publicação bloqueada.');
 if(typeof inventario.bucketRespostasPublico!=='boolean' ||
    typeof inventario.papelBackendRestrito!=='boolean')
    throw Error('Estado das permissões incompleto; publicação bloqueada.');
 const bloqueadores=[];
 const exigir=(condicao,motivo)=>{if(!condicao)bloqueadores.push(motivo);};
 exigir(inventario.funcoesLegadasPublicas===0,'Há funções legadas acessíveis apenas por protocolo.');
 exigir(inventario.bucketRespostasPublico===false,'Os documentos de resposta ainda estão públicos.');
 exigir(inventario.protocolosDuplicados===0,'Há protocolos duplicados a conciliar com segurança.');
 exigir(inventario.semProtocolo===0,'Existem solicitações sem protocolo; revisão administrativa obrigatória antes da liberação.');
 exigir(inventario.papelBackendRestrito===true,'A conta de banco de privilégios mínimos ainda não está pronta.');
 exigir(validacoes.apiPrivadaImplantada===true,'A API HTTPS privada ainda não foi implantada.');
 exigir(validacoes.consultaChaveTestada===true,'Consulta por protocolo + chave ainda não foi validada de ponta a ponta.');
 exigir(validacoes.recuperacaoManualTestada===true,'Primeiro acesso/recuperação manual por WhatsApp não foi validado no ambiente-alvo.');
 exigir(validacoes.anexosPrivadosTestados===true,'Abertura de anexos privados ainda não foi validada.');
 exigir(validacoes.mfaPainelTestado===true,'Autorização e MFA do Painel precisam de validação.');
 exigir(validacoes.backupConfirmado===true,'Backup restaurável ainda não foi confirmado.');
 exigir(validacoes.autorizacaoFinal===true,'Falta autorização específica para reativação pública.');
 // Chaves zero não indicam violação de segurança: casos antigos precisam de
 // atendimento real antes de gerar a primeira chave. Não emitir em lote sem identidade.
 if(inventario.totalSolicitacoes>0&&inventario.chavesAtivas===0)
  exigir(validacoes.primeiroAcessoLegadoTestado===true,'Nenhuma chave ativa: falta teste de primeiro acesso dos protocolos antigos.');
 return {pronto:bloqueadores.length===0,bloqueadores};
}
