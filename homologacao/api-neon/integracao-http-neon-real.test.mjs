// Integração HTTP -> pg -> Neon REAL. Não executa sem opt-in e fixture sintética.
// Requer MANDATO_TESTE_NEON_REAL=sim, DATABASE_URL (papel mandato_api_homologacao),
// NEON_HOST_HOMOLOGACAO, TESTE_PROTOCOLO_PRIVADO e TESTE_CHAVE_PRIVADA.
// A fixture deve ser emitida em homologação; jamais usar dados de cidadãos.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {iniciarHomologacao} from './iniciar-homologacao.mjs';
const ativo=process.env.MANDATO_TESTE_NEON_REAL==='sim';
test('HTTP -> Node pg -> Neon real, com chave de fixture sintética', {skip:!ativo},async()=>{
 const env={...process.env,MANDATO_AMBIENTE:'homologacao',HABILITAR_API_NEON:'sim',HABILITAR_CONSULTA_PRIVADA_HOMOLOGACAO:'sim'};
 const protocolo=env.TESTE_PROTOCOLO_PRIVADO;
 const chave=env.TESTE_CHAVE_PRIVADA;
 if(!protocolo||!chave)throw Error('Fixture sintética de chave e protocolo obrigatória');
 if(env.HABILITAR_ROTAS_CIDADAO_TESTES==='sim')throw Error('Rotas legadas não podem estar habilitadas');
 const instancia=await iniciarHomologacao({env});
 await new Promise((resolve,reject)=>{instancia.servidor.once('error',reject);instancia.servidor.listen(0,'127.0.0.1',resolve);});
 try {
  const base='http://127.0.0.1:'+instancia.servidor.address().port;
  const enviar=(p,c)=>fetch(base+'/api/solicitacoes/consultar',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({protocolo:p,chave:c})
  });
  const valida=await enviar(protocolo,chave);
  assert.equal(valida.status,200,'Consulta real com chave válida deve retornar 200');
  const corpo=await valida.json();
  assert.equal(corpo.resultado.length,1,'Fixture sintética deve existir');
  assert.deepEqual(Object.keys(corpo.resultado[0]).sort(),['assunto','status']);
  assert.deepEqual(corpo.respostas,[]);
  assert.deepEqual(corpo.historico,[]);
  assert.deepEqual(corpo.anexos,[]);
  const invalida=await enviar(protocolo,'A'.repeat(43));
  assert.equal(invalida.status,200);
  assert.deepEqual((await invalida.json()).resultado,[]);
  const protocoloErrado=await enviar('PROTOCOLO-INEXISTENTE',chave);
  assert.equal(protocoloErrado.status,200);
  assert.deepEqual((await protocoloErrado.json()).resultado,[]);
  const legado=await fetch(base+'/api/recuperacao/solicitar',{
   method:'POST',headers:{'Content-Type':'application/json'},body:'{}'
  });
  assert.equal(legado.status,503);
 }finally{await instancia.fechar();}
});
