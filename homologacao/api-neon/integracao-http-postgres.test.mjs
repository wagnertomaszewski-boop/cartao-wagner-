import {test} from 'node:test';
import assert from 'node:assert/strict';
import {iniciarHomologacao} from './iniciar-homologacao.mjs';

// Integração HTTP -> inicialização -> executor PostgreSQL com driver falso.
// Não usa credenciais, banco real ou dados de moradores.
test('HTTP consulta aciona funções permitidas sob papel cidadão e retorna somente projeção pública',async()=>{
 const comandos=[];
 let encerrado=false;
 class Pool {
  async connect(){return {query:async(sql,params)=>{
   comandos.push([sql,params]);
   if(sql.includes('consulta_segura('))return {rows:[{assunto:'Teste fictício',status:'recebido',segredo:'não divulgar'}]};
   if(sql.includes('consulta_respostas_segura('))return {rows:[]};
   if(sql.includes('consulta_nomes_anexos_segura('))return {rows:[{nome_arquivo:'foto-ficticia.jpg',caminho_privado:'não divulgar'}]};
   if(sql.includes('consulta_historico_segura('))return {rows:[{status:'recebido',observacao:'Teste',criado_em:'2026-11-07T00:00:00Z',nota_privada:'não divulgar'}]};
   return {rows:[]};
  },release(){}};}
  async end(){encerrado=true;}
 }
 const instancia=await iniciarHomologacao({env:{MANDATO_AMBIENTE:'homologacao',HABILITAR_API_NEON:'sim',HABILITAR_ROTAS_CIDADAO_TESTES:'sim',DATABASE_URL:'postgresql://usuario:senha@localhost:5432/testes'},carregarPg:async()=>({default:{Pool}})});
 await new Promise(resolve=>instancia.servidor.listen(0,'127.0.0.1',resolve));
 try{
  const resposta=await fetch('http://127.0.0.1:'+instancia.servidor.address().port+'/api/solicitacoes/consultar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({protocolo:'FICTICIO-001',chave:'a'.repeat(64)})});
  assert.equal(resposta.status,200);
  const corpo=await resposta.json();
  assert.deepEqual(corpo.resultado,[{assunto:'Teste fictício',status:'recebido'}]);
  assert.deepEqual(corpo.anexos,[{nome_arquivo:'foto-ficticia.jpg'}]);
  assert.deepEqual(corpo.historico,[{status:'recebido',observacao:'Teste',criado_em:'2026-11-07T00:00:00Z'}]);
  assert.ok(!JSON.stringify(corpo).includes('não divulgar'));
  assert.equal(comandos.filter(([sql])=>sql==='SET LOCAL ROLE mandato_cidadao_a').length,4);
  assert.equal(comandos.filter(([sql])=>sql==='COMMIT').length,4);
  assert.equal(comandos.filter(([sql])=>sql.startsWith('SELECT * FROM mandato_testes.')).length,4);
 }finally{await instancia.fechar();}
 assert.equal(encerrado,true);
});

test('método incorreto em decisão administrativa não invoca handler',async()=>{
 let chamadas=0;
 const {criarServidor}=await import('./server.mjs');
 const servidor=criarServidor({verificarAdmin:async()=>true,verificarIdentidade:async()=>true,operacoes:{decidir:async()=>{chamadas++;return {};}}});
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+servidor.address().port+'/api/admin/recuperacoes/12/decisao';
  for(const method of ['GET','PUT','DELETE'])assert.equal((await fetch(base,{method,headers:{Authorization:'Bearer ficticio'}})).status,404);
  assert.equal(chamadas,0);
 }finally{await new Promise(resolve=>servidor.close(resolve));}
});
