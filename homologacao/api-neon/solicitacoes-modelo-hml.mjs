import {randomUUID,randomBytes,createHmac} from 'node:crypto';
const erro=mensagem=>Object.assign(Error(mensagem),{status:400});
const texto=(v,max=2000)=>typeof v==='string'?v.trim().slice(0,max):'';
// Contrato extraído dos três clientes e do inventário; não lê produção.
// Mantém os registros de origem separados da credencial privada de acompanhamento.
export function adaptarSolicitacao({solicitacao:s,historico=[],respostas=[],fiscalizacao=[]}){
 if(!s||s.id==null)throw erro('Solicitação de origem inválida');
 const id=String(s.id),pertence=r=>String(r.solicitacao_id)===id;
 const anexos=v=>{if(typeof v==='string'){try{v=JSON.parse(v);}catch{v=[];}}return (Array.isArray(v)?v:[]).slice(0,20).map(a=>({nome:texto(typeof a==='string'?a.split('/').pop():a?.nome,160)||'Anexo privado'}));};
 return {idOrigem:id,protocoloOrigem:texto(s.protocolo,80)||null,assunto:texto(s.assunto,160),descricao:texto(s.descricao),localidade:texto(s.localidade,160),status:texto(s.status,80)||'Recebida',criadoEm:s.criado_em||null,atualizadoEm:s.atualizado_em||null,anexos:anexos(s.anexos),
 historico:historico.filter(pertence).map(h=>({status:texto(h.status,80),criadoEm:h.criado_em||null})),
 respostas:respostas.filter(pertence).map(r=>({mensagem:texto(r.mensagem),criadoEm:r.criado_em||null,anexos:anexos(r.anexos)})),
 // Fiscalização e anotações internas não pertencem ao retorno público.
 fiscalizacao:fiscalizacao.filter(pertence).map(f=>({tipo:texto(f.tipo,80),descricao:texto(f.descricao),registradoEm:f.registrado_em||null}))};
}
export function criarCadastroModeloHml({pool,segredo}){
 const hash=(id,v)=>createHmac('sha256',segredo).update(id+':'+v).digest('hex');
 async function registrar({modelo,telefone,origem,legado=false}){
 const c=await pool.connect();try{await c.query('BEGIN');
 const seq=(await c.query("SELECT nextval('auth_admin_hml.protocolo_modelo_seq')::text AS numero")).rows[0].numero;
 const id=randomUUID(),interno='HML-'+id,protocolo=modelo.protocoloOrigem|| (legado?interno:new Date().getUTCFullYear()+'-'+seq),chave=legado?null:randomBytes(32).toString('base64url');
 // Legados sem chave recebem hash aleatório inacessível até recuperação aprovada.
 const segredoInicial=chave||randomBytes(32).toString('base64url');
 await c.query('INSERT INTO auth_admin_hml.pedidos(id,protocolo,protocolo_publico,chave_hash,telefone_cadastrado,dados_solicitacao) VALUES($1,$2,$3,$4,$5,$6)',[id,interno,protocolo,hash(interno,segredoInicial),telefone,JSON.stringify({...modelo,idOrigem:legado?modelo.idOrigem:seq,origem,legado})]);
 await c.query('INSERT INTO auth_admin_hml.auditoria(evento,pedido_id) VALUES($1,$2)',[legado?'modelo_legado_associado':'modelo_cadastro_chave_gerada',id]);
 await c.query('COMMIT');return {id,protocolo,chaveInicial:chave,ficticio:true,recuperacaoNecessaria:legado};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
 return {
 async cadastrar(d){
 if(d.ficticio!==true||!['mandato','v2'].includes(d.origem)||d.p_whatsapp!=='+5551000000000'||!texto(d.p_nome,120)||!texto(d.p_assunto,160)||!texto(d.p_descricao)||!texto(d.p_localidade,160)||Object.hasOwn(d,'protocolo')||Object.hasOwn(d,'chave'))throw erro('Use somente dados fictícios e o telefone de teste indicado.');
 const modelo=adaptarSolicitacao({solicitacao:{id:'novo',assunto:d.p_assunto,descricao:d.p_descricao,localidade:d.p_localidade,status:'Recebida',criado_em:new Date().toISOString(),anexos:[]}});
 return registrar({modelo,telefone:d.p_whatsapp,origem:d.origem});
 },
 async importarFixture(d){
 // Somente cenários representativos fixos, não há importação de cidadãos reais.
 if(!['legado','sem-protocolo','alternativo'].includes(d.cenario))throw erro('Cenário fictício inválido');
 const numero=(await pool.query("SELECT nextval('auth_admin_hml.protocolo_modelo_seq')::text AS numero")).rows[0].numero;
 const id='legado-'+numero,protocolo=d.cenario==='sem-protocolo'?null:d.cenario==='alternativo'?'LEGADO-'+numero:'2025-'+numero;
 const modelo=adaptarSolicitacao({solicitacao:{id,protocolo,assunto:'Iluminação fictícia',descricao:'Manutenção de ponto de iluminação de teste.',localidade:'Localidade de homologação',status:'Em andamento',criado_em:'2025-01-01T12:00:00Z',anexos:['privado/foto-teste.jpg']},historico:[{solicitacao_id:id,status:'Recebida',criado_em:'2025-01-01T12:00:00Z'},{solicitacao_id:id,status:'Em andamento',criado_em:'2025-01-02T12:00:00Z'}],respostas:[{solicitacao_id:id,mensagem:'Resposta fictícia preservada.',criado_em:'2025-01-02T12:00:00Z',anexos:[{nome:'Resposta.pdf',url:'https://exemplo.invalid/privado'}]}],fiscalizacao:[{solicitacao_id:id,tipo:'fiscalizacao',descricao:'Anotação interna fictícia.',registrado_em:'2025-01-02T12:00:00Z'}]});
 return registrar({modelo,telefone:'+5551000000000',origem:'legado',legado:true});
 },
 async listar(){const r=await pool.query("SELECT id,protocolo_publico AS protocolo,dados_solicitacao FROM auth_admin_hml.pedidos WHERE dados_solicitacao IS NOT NULL ORDER BY protocolo_publico DESC LIMIT 50");return {solicitacoes:r.rows.map(r=>({id:r.id,protocolo:r.protocolo,...r.dados_solicitacao}))};}
 };
}
