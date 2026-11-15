// Adaptador transacional para o cadastro definitivo (ainda não ativado).
// Uso exclusivo por backend autenticado, com pool PostgreSQL privado.
// A chave é gerada pelo backend, entregue uma única vez ao cidadão e nunca ao Painel.
import { criarChave, verificadorHmac, verificarSegredoServidor } from './segredos-privados.mjs';

export function criarRepositorioChavesProducao({pool, segredoServidor}) {
 if (!pool?.connect || typeof segredoServidor !== 'string' || Buffer.byteLength(segredoServidor)<32)
  throw new Error('Configuração privada insuficiente');
 verificarSegredoServidor(segredoServidor);
 const verificar = chave => verificadorHmac('key',chave,segredoServidor);
 return {
  // Cadastro e chave na mesma transação: evita solicitação sem acesso privado.
  async cadastrarComChave({nome,whatsapp,localidade,assunto,descricao,anexos=[],latitude=null,longitude=null}) {
   if (![nome,whatsapp,localidade,assunto,descricao].every(v=>typeof v==='string'&&v.trim()) ||
       !Array.isArray(anexos)||anexos.some(a=>typeof a!=='string') ||
       ((latitude===null)!==(longitude===null)) ||
       (latitude!==null&&(!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude< -90||latitude>90||longitude< -180||longitude>180)))
     throw new Error('Dados de solicitação inválidos');
   const chave=criarChave();
   const cliente=await pool.connect();
   try {
    await cliente.query('BEGIN');
    const inserida=await cliente.query(
     'INSERT INTO public.solicitacoes(nome,whatsapp,localidade,assunto,descricao,anexos,latitude,longitude) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,protocolo',
     [nome.trim(),whatsapp.trim(),localidade.trim(),assunto.trim(),descricao.trim(),anexos.length?anexos:null,latitude,longitude]);
    const {id,protocolo}=inserida.rows[0]||{};
    if(!id||!protocolo)throw new Error('Protocolo não gerado');
    await cliente.query(
     'INSERT INTO mandato_privado.chaves_acompanhamento(solicitacao_id,segredo_verificador) VALUES($1,$2)',
     [id,verificar(chave)]);
    await cliente.query('COMMIT');
    return {protocolo,chave};
   } catch(e) {
    await cliente.query('ROLLBACK');
    throw e;
   } finally { cliente.release(); }
  },
  async vincularChave({solicitacaoId, protocolo}) {
   if (!Number.isSafeInteger(solicitacaoId)||solicitacaoId<=0||typeof protocolo!=='string'||!protocolo.trim())
    throw new Error('Solicitação inválida');
   const chave=criarChave();
   const cliente=await pool.connect();
   try {
    await cliente.query('BEGIN');
    const {rows}=await cliente.query(
      'SELECT id FROM public.solicitacoes WHERE id=$1 AND protocolo=$2 FOR UPDATE',
      [solicitacaoId,protocolo.trim()]);
    if(rows.length!==1) throw new Error('Solicitação não encontrada');
    const resultado=await cliente.query(
      'INSERT INTO mandato_privado.chaves_acompanhamento(solicitacao_id,segredo_verificador) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING solicitacao_id',
      [solicitacaoId,verificar(chave)]);
    if(resultado.rowCount!==1) throw new Error('Chave já vinculada');
    await cliente.query('COMMIT');
    return {protocolo:protocolo.trim(),chave};
   } catch(e) {
    await cliente.query('ROLLBACK');
    throw e;
   } finally { cliente.release(); }
  }
 };
}
