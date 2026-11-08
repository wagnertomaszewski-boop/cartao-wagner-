// Preparação da migração de protocolos legados em HOMOLOGAÇÃO.
// A chave só pode ser emitida após identidade confirmada pelo servidor.
// Não recebe nem armazena nomes, telefones ou registros reais.
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
const protocoloValido=p=>typeof p==='string'&&p.trim().length>0&&p.length<=40;
export function prepararChaveLegada({protocolo,identidadeVerificada,gerarBytes=randomBytes}={}){
 if(!protocoloValido(protocolo))throw Error('Protocolo inválido');
 if(identidadeVerificada!==true)throw Error('Verificação de identidade obrigatória');
 const bytes=gerarBytes(32);
 if(!Buffer.isBuffer(bytes)||bytes.length!==32)throw Error('Gerador de chave inválido');
 const chave=bytes.toString('hex');
 const hash=createHash('sha256').update(chave,'utf8').digest('hex');
 return {protocolo:protocolo.trim(),chave,hash};
}
export function verificarChaveLegada({chave,hash}={}){
 if(typeof chave!=='string'||typeof hash!=='string'||!/^[a-f0-9]{64}$/i.test(hash)||!/^[a-f0-9]{64}$/.test(chave))return false;
 const calculado=createHash('sha256').update(chave,'utf8').digest();
 return timingSafeEqual(calculado,Buffer.from(hash,'hex'));
}
