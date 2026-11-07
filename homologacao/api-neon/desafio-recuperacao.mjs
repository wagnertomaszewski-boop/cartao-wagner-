import {randomInt, randomBytes, createHmac, timingSafeEqual} from 'node:crypto';

// Componente isolado de homologação. Não envia WhatsApp nem libera chaves.
// Para produção: persistência transacional compartilhada, rate limit distribuído,
// vinculação a contato previamente verificado e provedor de mensagens autorizado.
export function criarDesafiosRecuperacao({segredo, agora=()=>Date.now(), validadeMs=300000, maxTentativas=5, gerarCodigo=()=>String(randomInt(0,1000000)).padStart(6,'0')}={}) {
  if(typeof segredo!=='string'||Buffer.byteLength(segredo)<32) throw Error('Segredo do servidor insuficiente');
  if(!Number.isSafeInteger(validadeMs)||validadeMs<1000||!Number.isInteger(maxTentativas)||maxTentativas<1) throw Error('Configuração inválida');
  const registros=new Map();
  const hash=(id,codigo,sal)=>createHmac('sha256',segredo).update(id+'\0'+sal+'\0'+codigo).digest();
  const idValido=id=>typeof id==='string'&&id.length>0&&id.length<=128;
  return {
    emitir(id) {
      if(!idValido(id)) throw Error('Identificador inválido');
      const codigo=gerarCodigo();
      if(!/^\d{6}$/.test(codigo)) throw Error('Código inválido');
      const sal=randomBytes(16).toString('hex');
      registros.set(id,{sal,digest:hash(id,codigo,sal),expira:agora()+validadeMs,tentativas:0});
      return codigo; // entregar somente ao adaptador de mensagens do servidor
    },
    confirmar(id,codigo) {
      if(!idValido(id)||typeof codigo!=='string'||!/^\d{6}$/.test(codigo)) return false;
      const registro=registros.get(id);
      if(!registro) return false;
      if(agora()>=registro.expira||registro.tentativas>=maxTentativas){registros.delete(id);return false;}
      registro.tentativas++;
      const confere=timingSafeEqual(registro.digest,hash(id,codigo,registro.sal));
      if(confere||registro.tentativas>=maxTentativas) registros.delete(id);
      return confere;
    },
    invalidar(id){registros.delete(id);}
  };
}
