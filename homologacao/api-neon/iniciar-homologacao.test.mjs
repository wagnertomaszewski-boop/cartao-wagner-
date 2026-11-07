import {test} from 'node:test';
import assert from 'node:assert/strict';
import {iniciarHomologacao} from './iniciar-homologacao.mjs';

test('não inicializa sem ambiente explicitamente homologado',async()=>{
 await assert.rejects(iniciarHomologacao({env:{},carregarPg:async()=>{throw Error('não deveria carregar')}}),/homologação obrigatório/);
});
test('não inicializa sem habilitação explícita',async()=>{
 await assert.rejects(iniciarHomologacao({env:{MANDATO_AMBIENTE:'homologacao'},carregarPg:async()=>{throw Error('não deveria carregar')}}),/desabilitada/);
});
test('exige segredo de conexão no servidor',async()=>{
 await assert.rejects(iniciarHomologacao({env:{MANDATO_AMBIENTE:'homologacao',HABILITAR_API_NEON:'sim'},carregarPg:async()=>{throw Error('não deveria carregar')}}),/DATABASE_URL/);
});

test('rejeita endereço de banco Supabase em homologação antes de abrir conexão',async()=>{
 await assert.rejects(iniciarHomologacao({env:{MANDATO_AMBIENTE:'homologacao',HABILITAR_API_NEON:'sim',DATABASE_URL:'postgresql://usuario:senha@db.pmmsdjozyyxkbuqlkfpb.supabase.co:5432/postgres'},carregarPg:async()=>{throw Error('NÃO deve abrir conexão');}}),/Banco de produção proibido/);
});

test('fechar sem iniciar servidor libera conexões do pool',async()=>{
 let encerrou=false;
 class Pool {async end(){encerrou=true;} async connect(){throw Error('Conexão não deveria ser usada');}}
 const instancia=await iniciarHomologacao({env:{MANDATO_AMBIENTE:'homologacao',HABILITAR_API_NEON:'sim',DATABASE_URL:'postgresql://usuario:senha@localhost:5432/testes'},carregarPg:async()=>({default:{Pool}})});
 await instancia.fechar();
 assert.equal(encerrou,true);
});

test('não aceita servidor remoto não autorizado mesmo com ambiente de homologação',async()=>{
 const env={MANDATO_AMBIENTE:'homologacao',HABILITAR_API_NEON:'sim',DATABASE_URL:'postgresql://usuario:senha@db.outro-servidor.example:5432/testes'};
 await assert.rejects(iniciarHomologacao({env,carregarPg:async()=>{throw Error('NÃO deve conectar');}}),/Destino de homologação não autorizado/);
});
test('não confia em host Neon sem correspondência exata configurada',async()=>{
 const env={MANDATO_AMBIENTE:'homologacao',HABILITAR_API_NEON:'sim',DATABASE_URL:'postgresql://usuario:senha@ep-qualquer.neon.tech:5432/testes',NEON_HOST_HOMOLOGACAO:'ep-outro.neon.tech'};
 await assert.rejects(iniciarHomologacao({env,carregarPg:async()=>{throw Error('NÃO deve conectar');}}),/Destino de homologação não autorizado/);
});

test('Neon remoto exige usuário e senha além do hostname permitido',async()=>{
 const env={MANDATO_AMBIENTE:'homologacao',HABILITAR_API_NEON:'sim',DATABASE_URL:'postgresql://ep-isolado.neon.tech:5432/testes',NEON_HOST_HOMOLOGACAO:'ep-isolado.neon.tech'};
 await assert.rejects(iniciarHomologacao({env,carregarPg:async()=>{throw Error('NÃO deve conectar');}}),/Destino de homologação não autorizado/);
});

test('rotas de cidadão permanecem desabilitadas sem ativação separada',async()=>{
 class Pool {async end(){} async connect(){throw Error('Não deveria consultar banco');}}
 const instancia=await iniciarHomologacao({env:{MANDATO_AMBIENTE:'homologacao',HABILITAR_API_NEON:'sim',DATABASE_URL:'postgresql://usuario:senha@localhost:5432/testes'},carregarPg:async()=>({default:{Pool}})});
 await new Promise(resolve=>instancia.servidor.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+instancia.servidor.address().port;
  for(const rota of ['/api/recuperacao/solicitar','/api/solicitacoes/consultar']){
   const resposta=await fetch(base+rota,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
   assert.equal(resposta.status,503);
  }
  const saude=await (await fetch(base+'/health')).json();
  assert.equal(saude.rotasCidadaoHabilitadas,false);
 }finally{await instancia.fechar();}
});


test('mesmo com rotas de cidadão habilitadas, decisão administrativa permanece bloqueada',async()=>{
 class Pool {async end(){} async connect(){throw Error('Banco não deve ser consultado');}}
 const instancia=await iniciarHomologacao({env:{MANDATO_AMBIENTE:'homologacao',HABILITAR_API_NEON:'sim',HABILITAR_ROTAS_CIDADAO_TESTES:'sim',DATABASE_URL:'postgresql://usuario:senha@localhost:5432/testes'},carregarPg:async()=>({default:{Pool}})});
 await new Promise(resolve=>instancia.servidor.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+instancia.servidor.address().port;
  const saude=await (await fetch(base+'/health')).json();
  assert.equal(saude.rotasCidadaoHabilitadas,true);
  const decisao=await fetch(base+'/api/admin/recuperacoes/1/decisao',{method:'POST',headers:{Authorization:'Bearer token-ficticio','Content-Type':'application/json'},body:JSON.stringify({aprovar:true,identidadeConfirmada:true})});
  assert.equal(decisao.status,403);
 }finally{await instancia.fechar();}
});

test('hostname que apenas contém neon.tech não é aceito como Neon isolado',async()=>{
 const env={MANDATO_AMBIENTE:'homologacao',HABILITAR_API_NEON:'sim',DATABASE_URL:'postgresql://usuario:senha@ep-isolado.neon.tech.atacante.example:5432/testes',NEON_HOST_HOMOLOGACAO:'ep-isolado.neon.tech.atacante.example'};
 await assert.rejects(iniciarHomologacao({env,carregarPg:async()=>{throw Error('Não deveria conectar');}}),/Destino de homologação não autorizado/);
});
