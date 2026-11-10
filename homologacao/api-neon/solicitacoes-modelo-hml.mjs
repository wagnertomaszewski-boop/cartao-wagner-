import {randomUUID,randomBytes,createHmac,createHash} from 'node:crypto';
const erro=mensagem=>Object.assign(Error(mensagem),{status:400});
const texto=(v,max=2000)=>typeof v==='string'?v.trim().slice(0,max):'';
// Contrato extraído dos três clientes e do inventário; não lê produção.
// Mantém os registros de origem separados da credencial privada de acompanhamento.
export function adaptarSolicitacao({solicitacao:s,historico=[],respostas=[],fiscalizacao=[]}){
 if(!s||s.id==null)throw erro('Solicitação de origem inválida');
 const id=String(s.id),pertence=r=>String(r.solicitacao_id)===id;
 const respostasDaSolicitacao=respostas.filter(pertence);if(typeof s.resposta==='string'&&s.resposta.trim()&&!respostasDaSolicitacao.some(r=>r.mensagem?.trim()===s.resposta.trim()))respostasDaSolicitacao.push({solicitacao_id:s.id,mensagem:s.resposta,criado_em:s.atualizado_em||s.criado_em,anexos:[]});
 const anexos=v=>{if(typeof v==='string'){try{v=JSON.parse(v);}catch{v=[];}}return (Array.isArray(v)?v:[]).slice(0,20).map(a=>({nome:texto(typeof a==='string'?a.split('/').pop():a?.nome,160)||'Anexo privado'}));};
 return {fonteOriginal:{solicitacao:structuredClone(s),historico:structuredClone(historico.filter(pertence)),respostas:structuredClone(respostas.filter(pertence)),fiscalizacao:structuredClone(fiscalizacao.filter(pertence))},anotacaoInterna:texto(s.anotacao_interna,20000),lembrete:s.lembrete_em||null,encaminhadoPrefeituraEm:s.encaminhado_prefeitura_em||null,protocoloPrefeitura:texto(s.protocolo_prefeitura,200),latitude:s.latitude??null,longitude:s.longitude??null,solicitante:texto(s.nome||s.solicitante,120),idOrigem:id,protocoloOrigem:texto(s.protocolo,80)||null,assunto:texto(s.assunto,160),descricao:texto(s.descricao),localidade:texto(s.localidade,160),status:texto(s.status,80)||'Recebida',criadoEm:s.criado_em||null,atualizadoEm:s.atualizado_em||null,anexos:anexos(s.anexos),
 historico:historico.filter(pertence).map(h=>({idOrigem:h.id==null?null:String(h.id),status:texto(h.status,80),criadoEm:h.criado_em||null})),
 respostas:respostasDaSolicitacao.map(r=>({mensagem:texto(r.mensagem),criadoEm:r.criado_em||null,anexos:anexos(r.anexos)})),
 // Fiscalização e anotações internas não pertencem ao retorno público.
 fiscalizacao:fiscalizacao.filter(pertence).map(f=>({id:f.id==null?undefined:String(f.id),usuarioId:f.registrado_por||null,protocoloReferencia:texto(f.protocolo_referencia,200),responsavel:texto(f.responsavel,120),tipo:texto(f.tipo,80),descricao:texto(f.descricao),registradoEm:f.registrado_em||null}))};
}
export function criarCadastroModeloHml({pool,segredo}){
 const hash=(id,v)=>createHmac('sha256',segredo).update(id+':'+v).digest('hex');
 async function registrar({modelo,telefone,origem,legado=false,operacao=null,dadosHash=null},cliente=null){
 const proprio=!cliente,c=cliente||await pool.connect();try{if(proprio)await c.query('BEGIN');
 const seq=(await c.query("SELECT nextval('auth_admin_hml.protocolo_modelo_seq')::text AS numero")).rows[0].numero;
 const id=randomUUID(),interno='HML-'+id,protocolo=modelo.protocoloOrigem|| (legado?interno:new Date().getUTCFullYear()+'-'+seq),chave=legado?null:operacao?createHmac('sha256',segredo).update('cadastro-chave:'+operacao).digest('base64url'):randomBytes(32).toString('base64url');
 // Legados sem chave recebem hash aleatório inacessível até recuperação aprovada.
 const segredoInicial=chave||randomBytes(32).toString('base64url');
 const operacaoHash=operacao?createHmac('sha256',segredo).update('cadastro-operacao:'+operacao).digest('hex'):null;
 const inserido=await c.query('INSERT INTO auth_admin_hml.pedidos(id,protocolo,protocolo_publico,chave_hash,telefone_cadastrado,dados_solicitacao,cadastro_operacao_hash,cadastro_dados_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(cadastro_operacao_hash) DO NOTHING RETURNING id',[id,interno,protocolo,hash(interno,segredoInicial),telefone,JSON.stringify({...modelo,idOrigem:legado?modelo.idOrigem:seq,origem,legado}),operacaoHash,dadosHash]);
 if(!inserido.rows.length){
  const anterior=(await c.query('SELECT id,protocolo,protocolo_publico,chave_hash,cadastro_dados_hash FROM auth_admin_hml.pedidos WHERE cadastro_operacao_hash=$1 FOR UPDATE',[operacaoHash])).rows[0];
  if(!anterior||anterior.cadastro_dados_hash!==dadosHash||anterior.chave_hash!==hash(anterior.protocolo,chave))throw Object.assign(Error('Este envio já foi processado ou alterado. Use o acompanhamento ou a recuperação de acesso; nenhum novo registro foi criado.'),{status:409});
  if(proprio)await c.query('COMMIT');return {id:anterior.id,protocolo:anterior.protocolo_publico,chaveInicial:chave,ficticio:true,recuperacaoNecessaria:false,repetido:true};
 }
 await c.query('INSERT INTO auth_admin_hml.auditoria(evento,pedido_id) VALUES($1,$2)',[legado?'modelo_legado_associado':'modelo_cadastro_chave_gerada',id]);
 if(proprio)await c.query('COMMIT');return {id,protocolo,chaveInicial:chave,ficticio:true,recuperacaoNecessaria:legado};
 }catch(e){if(proprio)await c.query('ROLLBACK');throw e;}finally{if(proprio)c.release();}}
 return {
 async cadastrar(d){
 if(d.ficticio!==true||!['mandato','v2'].includes(d.origem)||d.p_whatsapp!=='+5551000000000'||!texto(d.p_nome,120)||!texto(d.p_assunto,160)||!texto(d.p_descricao)||!texto(d.p_localidade,160)||Object.hasOwn(d,'protocolo')||Object.hasOwn(d,'chave'))throw erro('Use somente dados fictícios e o telefone de teste indicado.');
 if(d.latitude!=null||d.longitude!=null){if(d.localizacaoAutorizada!==true||typeof d.latitude!=='number'||typeof d.longitude!=='number'||!Number.isFinite(d.latitude)||!Number.isFinite(d.longitude)||Math.abs(d.latitude)>90||Math.abs(d.longitude)>180)throw erro('Localização inválida ou sem autorização.');}
 if(Object.hasOwn(d,'operacaoId')&&(typeof d.operacaoId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(d.operacaoId)))throw erro('Identificador de envio inválido.');
 const dadosHash=d.operacaoId?createHmac('sha256',segredo).update('cadastro-dados:'+JSON.stringify([d.origem,texto(d.p_nome,120),d.p_whatsapp,texto(d.p_assunto,160),texto(d.p_descricao),texto(d.p_localidade,160),d.latitude??null,d.longitude??null,d.localizacaoAutorizada===true])).digest('hex'):null;
 const criadoEm=new Date().toISOString();
 const modelo=adaptarSolicitacao({solicitacao:{id:'novo',nome:d.p_nome,latitude:d.latitude??null,longitude:d.longitude??null,assunto:d.p_assunto,descricao:d.p_descricao,localidade:d.p_localidade,status:'Recebida',criado_em:criadoEm,anexos:[]},historico:[{solicitacao_id:'novo',status:'Recebida',criado_em:criadoEm}]});
 modelo.localizacaoAutorizada=d.localizacaoAutorizada===true&&d.latitude!=null&&d.longitude!=null;modelo.localizacaoAutorizadaEm=modelo.localizacaoAutorizada?criadoEm:null;
 return registrar({modelo,telefone:d.p_whatsapp,origem:d.origem,operacao:d.operacaoId||null,dadosHash});
 },
 async importarLegadoFicticio(op,d){if(d.ficticio!==true||d.solicitacao?.whatsapp!=='+5551000000000'||!d.solicitacao?.id||!op?.usuarioId)throw erro('Somente fonte fictícia e telefone reservado são aceitos na homologação.');const modelo=adaptarSolicitacao(d),origem='supabase-legado-ficticio',idOrigem=String(d.solicitacao.id);const canonico=v=>Array.isArray(v)?v.map(canonico):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonico(v[k])])):v;const sha=createHash('sha256').update(JSON.stringify(canonico(modelo.fonteOriginal))).digest('hex');const c=await pool.connect();try{await c.query('BEGIN');await c.query('INSERT INTO auth_admin_hml.importacoes_legadas(origem,id_origem,fonte_hash) VALUES($1,$2,$3) ON CONFLICT(origem,id_origem) DO UPDATE SET origem=EXCLUDED.origem',[origem,idOrigem,sha]);const anterior=(await c.query('SELECT * FROM auth_admin_hml.importacoes_legadas WHERE origem=$1 AND id_origem=$2 FOR UPDATE',[origem,idOrigem])).rows[0];if(anterior.fonte_hash!==sha)throw Object.assign(Error('Fonte alterada: reconciliação necessária; nenhum histórico foi sobrescrito.'),{status:409});if(anterior.solicitacao_id){const p=(await c.query('SELECT protocolo_publico FROM auth_admin_hml.pedidos WHERE id=$1',[anterior.solicitacao_id])).rows[0];await c.query('COMMIT');return {id:anterior.solicitacao_id,protocolo:p.protocolo_publico,chaveInicial:null,ficticio:true,recuperacaoNecessaria:true,repetido:true};}const p=await registrar({modelo,telefone:d.solicitacao.whatsapp,origem,legado:true},c);await c.query('UPDATE auth_admin_hml.importacoes_legadas SET solicitacao_id=$3 WHERE origem=$1 AND id_origem=$2',[origem,idOrigem,p.id]);await c.query("INSERT INTO auth_admin_hml.auditoria(evento,usuario_id,pedido_id) VALUES('modelo_legado_importado',$1,$2)",[op.usuarioId,p.id]);await c.query('COMMIT');return {...p,repetido:false};}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}},
 async importarFixture(d){
 // Somente cenários representativos fixos, não há importação de cidadãos reais.
 if(!['legado','sem-protocolo','alternativo'].includes(d.cenario))throw erro('Cenário fictício inválido');
 const numero=(await pool.query("SELECT nextval('auth_admin_hml.protocolo_modelo_seq')::text AS numero")).rows[0].numero;
 const id='legado-'+numero,protocolo=d.cenario==='sem-protocolo'?null:d.cenario==='alternativo'?'LEGADO/2025/'+numero:'2025-'+numero;
 const modelo=adaptarSolicitacao({solicitacao:{id,nome:'Pessoa fictícia legada',protocolo,assunto:'Iluminação fictícia',descricao:'Manutenção de ponto de iluminação de teste.',localidade:'Localidade de homologação',status:'Em andamento',criado_em:'2025-01-01T12:00:00Z',anexos:['privado/foto-teste.jpg']},historico:[{solicitacao_id:id,status:'Recebida',criado_em:'2025-01-01T12:00:00Z'},{solicitacao_id:id,status:'Em andamento',criado_em:'2025-01-02T12:00:00Z'}],respostas:[{solicitacao_id:id,mensagem:'Resposta fictícia preservada.',criado_em:'2025-01-02T12:00:00Z',anexos:[{nome:'Resposta.pdf',url:'https://exemplo.invalid/privado'}]}],fiscalizacao:[{solicitacao_id:id,tipo:'fiscalizacao',descricao:'Anotação interna fictícia.',registrado_em:'2025-01-02T12:00:00Z'}]});
 return registrar({modelo,telefone:'+5551000000000',origem:'legado',legado:true});
 },
 async listar({pagina=0,status='',protocolo=''}={}){if(!Number.isInteger(pagina)||pagina<0||pagina>100000||typeof status!=='string'||status.length>100||typeof protocolo!=='string'||protocolo.length>80)throw erro('Filtro inválido.');const args=[status,protocolo.trim()];const cond="dados_solicitacao IS NOT NULL AND ($1='' OR dados_solicitacao->>'status'=$1) AND ($2='' OR protocolo_publico=$2 OR protocolo=$2)";const total=(await pool.query('SELECT count(*)::int AS n FROM auth_admin_hml.pedidos WHERE '+cond,args)).rows[0].n;const r=await pool.query('SELECT id,COALESCE(protocolo_publico,protocolo) AS protocolo,dados_solicitacao FROM auth_admin_hml.pedidos WHERE '+cond+' ORDER BY protocolo_publico DESC LIMIT 50 OFFSET $3',[...args,pagina*50]);return {solicitacoes:r.rows.map(r=>({id:r.id,protocolo:r.protocolo,...r.dados_solicitacao})),total,pagina,limite:50,temMais:(pagina+1)*50<total};}
 };
}
