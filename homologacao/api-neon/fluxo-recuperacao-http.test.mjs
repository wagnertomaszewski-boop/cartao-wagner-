import test from 'node:test';
import assert from 'node:assert/strict';
import {iniciarHomologacao} from './iniciar-homologacao.mjs';

// Fluxo completo HTTP com driver PostgreSQL falso: nenhum dado ou banco real.
test('recuperação e consulta HTTP fictícias mantêm sigilo e papel restrito',async()=>{
 const comandos=[];
 let fechado=false;
 class Pool {
  async connect(){
   return {query:async(sql,parametros)=>{
    comandos.push({sql,parametros});
    if(sql.includes('pedir_recuperacao(')) return {rows:[{id:99,segredo:'INTERNO'}]};
    if(sql.includes('consulta_segura(')) return {rows:[{assunto:'Iluminação fictícia',status:'Em análise',cpf:'NÃO EXPOR'}]};
    if(sql.includes('consulta_respostas_segura(')) return {rows:[{texto:'Recebido',criado_em:'2026-11-07',autor_privado:'NÃO EXPOR'}]};
    if(sql.includes('consulta_nomes_anexos_segura(')) return {rows:[{nome_arquivo:'imagem-ficticia.jpg',caminho_interno:'NÃO EXPOR'}]};
    if(sql.includes('consulta_historico_segura(')) return {rows:[{status:'Em análise',observacao:'Encaminhado',criado_em:'2026-11-07',nota_interna:'NÃO EXPOR'}]};
    return {rows:[]};
   },release(){}};
  }
  async end(){fechado=true;}
 }
 const instancia=await iniciarHomologacao({
  env:{MANDATO_AMBIENTE:'homologacao',HABILITAR_API_NEON:'sim',HABILITAR_ROTAS_CIDADAO_TESTES:'sim',DATABASE_URL:'postgresql://usuario:senha@localhost:5432/testes'},
  carregarPg:async()=>({default:{Pool}})
 });
 await new Promise(resolve=>instancia.servidor.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+instancia.servidor.address().port;
 const post=(rota,dados)=>fetch(base+rota,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(dados)});
 try{
  const recuperar=await post('/api/recuperacao/solicitar',{protocolo:'FICTICIO-001',whatsapp:'51999999999'});
  assert.equal(recuperar.status,200);
  assert.deepEqual(await recuperar.json(),{mensagem:'Se os dados corresponderem, o pedido será analisado.'});
  const consulta=await post('/api/solicitacoes/consultar',{protocolo:'FICTICIO-001',chave:'a'.repeat(64)});
  assert.equal(consulta.status,200);
  const resposta=await consulta.json();
  assert.deepEqual(resposta,{
   resultado:[{assunto:'Iluminação fictícia',status:'Em análise'}],
   respostas:[{texto:'Recebido',criado_em:'2026-11-07'}],
   historico:[{status:'Em análise',observacao:'Encaminhado',criado_em:'2026-11-07'}],
   anexos:[{nome_arquivo:'imagem-ficticia.jpg'}]
  });
  assert.ok(!JSON.stringify(resposta).includes('NÃO EXPOR'));
  assert.equal((await post('/api/solicitacoes/consultar',{protocolo:'FICTICIO-001',chave:'curta'})).status,503);
  assert.equal((await fetch(base+'/api/admin/recuperacoes')).status,401);
  assert.equal(comandos.filter(x=>x.sql==='SET LOCAL ROLE mandato_cidadao_a').length,5);
  assert.equal(comandos.filter(x=>x.sql==='COMMIT').length,5);
  assert.ok(comandos.some(x=>x.sql==='SELECT mandato_testes.pedir_recuperacao($1,$2)' && x.parametros[0]==='FICTICIO-001'));
  assert.ok(comandos.some(x=>x.sql==='SELECT * FROM mandato_testes.consulta_segura($1,$2)' && x.parametros[1]==='a'.repeat(64)));
 }finally{await instancia.fechar();}
 assert.equal(fechado,true);
});
