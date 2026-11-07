/* Adaptador de recuperação — versão de desenvolvimento.
 * Por padrão, NUNCA chama a produção. Para ativar é necessário fornecer
 * explicitamente um backend de homologação com RPCs revisadas.
 */
export class RecuperacaoApi {
  constructor({baseUrl, publishableKey, ambiente='simulacao'}={}) {
    this.ambiente=ambiente;
    if(ambiente!=='simulacao' && ambiente!=='homologacao') throw new Error('Ambiente não autorizado');
    if(ambiente==='homologacao' && (!baseUrl || !publishableKey)) throw new Error('Configuração de homologação incompleta');
    this.baseUrl=baseUrl?.replace(/\/$/,'');
    this.publishableKey=publishableKey;
  }
  async rpc(nome, payload, token) {
    if(this.ambiente==='simulacao') throw new Error('Protótipo sem conexão ao banco');
    if(!['pedir_recuperacao_segura','listar_recuperacoes_admin','decidir_recuperacao_admin'].includes(nome)) throw new Error('RPC não permitida');
    const headers={'apikey':this.publishableKey,'Content-Type':'application/json','Authorization': 'Bearer '+(token||this.publishableKey)};
    const response=await fetch(this.baseUrl+'/rest/v1/rpc/'+nome,{method:'POST',headers,body:JSON.stringify(payload),cache:'no-store'});
    if(!response.ok) throw new Error('Não foi possível concluir a operação.');
    return response.json();
  }
  async solicitar(protocolo, whatsapp) {
    if(typeof protocolo!=='string'||protocolo.trim().length<5||protocolo.length>40) throw new Error('Protocolo inválido');
    const telefone=String(whatsapp||'').replace(/\D/g,'');
    if(telefone.length<10||telefone.length>13) throw new Error('WhatsApp inválido');
    if(this.ambiente==='simulacao') return {simulacao:true,mensagem:'Nenhum pedido enviado'};
    await this.rpc('pedir_recuperacao_segura',{p_protocolo:protocolo.trim(),p_whatsapp:telefone});
    return {mensagem:'Se os dados corresponderem ao cadastro, o pedido será analisado.'};
  }
  async listar(token) {
    if(!token) throw new Error('Administrador não autenticado');
    if(this.ambiente==='simulacao') return [];
    return this.rpc('listar_recuperacoes_admin',{},token);
  }
  async decidir(id,aprovar,identidadeConfirmada,token) {
    if(!token) throw new Error('Administrador não autenticado');
    if(!Number.isSafeInteger(id)||id<1) throw new Error('Pedido inválido');
    if(aprovar && identidadeConfirmada!==true) throw new Error('Confirme a identidade antes de aprovar');
    if(this.ambiente==='simulacao') return {simulacao:true,aprovado:!!aprovar,chave:null};
    return this.rpc('decidir_recuperacao_admin',{p_pedido_id:id,p_aprovar:!!aprovar},token);
  }
}
