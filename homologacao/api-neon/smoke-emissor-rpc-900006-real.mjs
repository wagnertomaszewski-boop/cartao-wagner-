// Executa UMA emissão sintética no Neon isolado, sem dados reais.
// A fonte de vínculo abaixo é um fixture independente APENAS de homologação.
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import pg from 'pg';
import {criarEmissorComprovanteAssinado} from './comprovante-assinado.mjs';
import {criarEmissorRpcFicticio} from './emissor-rpc-ficticio.mjs';
const env=process.env;
if(env.MANDATO_AMBIENTE!=='homologacao'||env.HABILITAR_API_NEON!=='sim'||env.AUTORIZAR_EMISSAO_FICTICIA_900006!=='sim'||!env.DATABASE_URL)
 throw Error('Emissão fictícia não autorizada neste ambiente');
const url=new URL(env.DATABASE_URL);
if(!url.hostname.endsWith('.neon.tech')||url.hostname!==env.NEON_HOST_HOMOLOGACAO||
 decodeURIComponent(url.username)!=='mandato_api_homologacao'||
 ['sslmode','sslcert','sslkey','sslrootcert'].some(k=>url.searchParams.has(k)))
 throw Error('Banco não autorizado');
const pool=new pg.Pool({connectionString:env.DATABASE_URL,ssl:{rejectUnauthorized:true},max:1});
const protocolo='LEGADO-EMISSAO-TESTE-900006',solicitacaoId=900006;
try{
 const consultarNeon=async(sql,args)=> (await pool.query(sql,args)).rows;
 const segredo=randomBytes(32);
 const comprovante=criarEmissorComprovanteAssinado({
  segredo,gerarNonce:()=>randomBytes(16).toString('hex')
 })({protocolo,identidadeConferida:true}); // Fixture sintético, NUNCA identidade real
 let chamadasVinculo=0;
 const emissor=criarEmissorRpcFicticio({
  consultarNeon,segredoComprovante:segredo,
  consultarSupabasePrivado:async(sql,args)=>{
   assert.match(sql,/SELECT id, protocolo FROM public.solicitacoes/);
   assert.deepEqual(args,[protocolo]);
   chamadasVinculo++;
   return [{id:solicitacaoId,protocolo}];
  },
  auditarTentativa:async()=>{} // Auditoria de emissão concluída é atômica na RPC
 });
 const resultado=await emissor.emitir({protocolo,comprovante});
 assert.equal(chamadasVinculo,1);
 assert.equal(resultado.protocolo,protocolo);
 assert.match(resultado.chave,/^[a-f0-9]{64}$/);
 const acesso=await pool.query('SELECT id FROM mandato_testes.consulta_segura($1,$2)',[protocolo,resultado.chave]);
 assert.equal(acesso.rows.length,1,'Chave emitida deve permitir consulta segura');
 await assert.rejects(()=>emissor.emitir({protocolo,comprovante}),/Inexistente ou duplicado/);
 console.log('PASS: emissão fictícia 900006 no Neon real, consulta com chave e bloqueio de duplicata');
}finally{await pool.end();}
