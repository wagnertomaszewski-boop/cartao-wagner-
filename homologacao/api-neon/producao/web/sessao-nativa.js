// Inserido como script clássico somente no HTML candidato do Painel.
// A identificação nativa apenas escolhe armazenamento; nunca concede acesso.
const painelBiometriaNativa=/\bMandatoPainelBiometria\/1\b/.test(navigator.userAgent);
let sessaoNativaMemoria=null;
if(painelBiometriaNativa){try{localStorage.removeItem(STORAGE_KEY);localStorage.removeItem('sb-pmmsdjozyyxkbuqlkfpb-auth-token');}catch{}}
function salvarSessao(sessao){
 if(painelBiometriaNativa){sessaoNativaMemoria=sessao?{access_token:sessao.access_token,expires_at:sessao.expires_at}:null;return;}
 localStorage.setItem(STORAGE_KEY,JSON.stringify(sessao));
}
function lerSessao(){
 if(painelBiometriaNativa)return sessaoNativaMemoria;
 try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');}catch{return null;}
}
function limparSessao(){
 sessaoNativaMemoria=null;window.mandatoLimparMfaNativo?.();
 if(painelBiometriaNativa)location.assign('mandato-painel://sair');
 try{localStorage.removeItem(STORAGE_KEY);localStorage.removeItem('sb-pmmsdjozyyxkbuqlkfpb-auth-token');}catch{}
}
if(painelBiometriaNativa){
 window.mandatoSessaoParaBiometria=()=>{
  const token=window.mandatoTokenMfaNativo?.();if(typeof token!=='string')return null;
  try{const c=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(c.aal!=='aal2'||!Number.isSafeInteger(c.exp)||c.exp*1000<=Date.now())return null;return JSON.stringify({access_token:token,expires_at:c.exp*1000});}catch{return null;}
 };
 window.mandatoRestaurarSessaoBiometrica=valor=>{
  try{const s=JSON.parse(valor);if(Object.keys(s).length!==2||typeof s.access_token!=='string'||!Number.isSafeInteger(s.expires_at)||s.expires_at<=Date.now())return false;
   salvarSessao(s);mostrarPainel();Promise.resolve(carregarSolicitacoes()).catch(()=>mostrarLogin('Entre novamente.'));return true;
  }catch{return false;}
 };
 addEventListener('pagehide',()=>{sessaoNativaMemoria=null;window.mandatoLimparMfaNativo?.();});
}
