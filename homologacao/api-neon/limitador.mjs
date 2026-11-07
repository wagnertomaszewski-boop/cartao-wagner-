// Limitador em memória, destinado APENAS a testes locais de uma instância.
// Produção exige limite compartilhado entre instâncias, por IP e protocolo.
export function criarLimitador({maximo=5,janelaMs=60000,maxChaves=10000,relogio=()=>Date.now()}={}) {
 if(!Number.isInteger(maximo)||maximo<1||!Number.isSafeInteger(janelaMs)||janelaMs<1||!Number.isInteger(maxChaves)||maxChaves<1)throw Error('Configuração inválida');
 const tentativas=new Map();
 return {
  verificar(chave) {
   if(typeof chave!=='string'||!chave||chave.length>200) return false;
   const agora=relogio();
   const atual=tentativas.get(chave);
   if(!atual||agora>=atual.expira){
    if(!atual && tentativas.size>=maxChaves){
      for(const [id,registro] of tentativas) if(agora>=registro.expira) tentativas.delete(id);
      if(tentativas.size>=maxChaves)return false;
    }
    tentativas.set(chave,{contagem:1,expira:agora+janelaMs});return true;}
   if(atual.contagem>=maximo)return false;
   atual.contagem++;return true;
  },
  limpar(){tentativas.clear();}
 };
}
