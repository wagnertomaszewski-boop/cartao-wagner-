// Integração exclusivamente com o diálogo biométrico nativo do APK cidadão de homologação.
// Na PWA e no navegador, não há simulação nem armazenamento de credenciais.
export function criarClienteBiometriaCidadao(ponte){
 if(!ponte||!['ativar','consultar','operar','desativar'].every(k=>typeof ponte[k]==='function'))return null;
 return {
  ativar(d){if(typeof d?.protocolo!=='string'||!d.protocolo.trim()||d.protocolo.length>80||/[\x00-\x1f\x7f]/.test(d.protocolo)||typeof d.chave!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(d.chave))throw Error('Consulte com protocolo e chave antes de ativar.');ponte.ativar(d.protocolo.trim(),d.chave);},
  consultar(){ponte.consultar();},desativar(){ponte.desativar();},
  operar(acao,arquivo=''){if(!['qr','leitura','baixar'].includes(acao)||acao==='baixar'&&!/^[0-9a-f-]{36}$/.test(arquivo))throw Error('Operação biométrica inválida.');ponte.operar(acao,arquivo);}
 };
}
