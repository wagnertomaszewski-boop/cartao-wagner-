import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {arquivosTelas,arquivosTelasPublicas} from './preparar-telas-hml.mjs';
import {criarClienteRecuperacaoManual,normalizarTelefone,uriWhatsappPrivada,ORIGEM_HML,formatarDataMandato} from '../../v2/seguranca/cliente-recuperacao-manual.mjs';
test('Render usa exatamente as telas e módulos versionados do V2 e Painel, sem incluir backends de produção',async()=>{
 const hashes=JSON.parse(await readFile(new URL('./telas/manifesto.json',import.meta.url),'utf8'));
 for(const p of arquivosTelas){const original=await readFile(new URL('../../'+p,import.meta.url),'utf8'),pacote=await readFile(new URL('./telas/'+p,import.meta.url),'utf8');assert.equal(pacote,original);assert.equal(hashes[p],createHash('sha256').update(original).digest('hex'));assert.doesNotMatch(pacote,/supabase\.co|consulta_publica_protocolo|localStorage|sessionStorage|console\.(log|error)/);}
});
test('cliente definitivo recusa origem de produção e protocolo sem chave antes de fazer requisição',async()=>{
 for(const origem of ['https://wagnertomaszewski-boop.github.io',ORIGEM_HML+'/',ORIGEM_HML+'.invalido', 'http://localhost'])assert.throws(()=>criarClienteRecuperacaoManual({origem}));
 let chamadas=0;const c=criarClienteRecuperacaoManual({origem:ORIGEM_HML,buscar:()=>{chamadas++;throw Error('Não deveria enviar');}});
 assert.throws(()=>c.consultar({protocolo:'HML-00000000-0000-0000-0000-000000000000'}),/chave/);assert.equal(chamadas,0);
 assert.equal(normalizarTelefone('(51) 99999-9999'),'+5551999999999');assert.throws(()=>normalizarTelefone('123'));
});
test('chave, recibo e código via POST HTTPS, sem URL/cache/cookies de administrador no cliente cidadão',async()=>{
 const calls=[];const c=criarClienteRecuperacaoManual({origem:ORIGEM_HML,buscar:async(u,o)=>{calls.push({u,o});return {ok:true,json:async()=>({confirmado:false})};}});
 const protocolo='HML-00000000-0000-0000-0000-000000000000',chave='a'.repeat(43),pedidoId='00000000-0000-0000-0000-000000000000';
 await c.consultar({protocolo,chave});await c.validar({pedidoId,recibo:'b'.repeat(43),codigo:'123456'});await c.auditoria(pedidoId);
 for(const {u,o}of calls){assert.ok(u.startsWith(ORIGEM_HML+'/hml/'));assert.ok(!u.includes(chave));assert.ok(!u.includes('123456'));assert.equal(o.cache,'no-store');assert.equal(o.redirect,'error');}
 assert.equal(calls[0].o.credentials,'omit');assert.equal(calls[1].o.credentials,'omit');assert.equal(calls[2].o.credentials,'same-origin');assert.equal(calls[0].o.method,'POST');assert.equal(JSON.parse(calls[1].o.body).codigo,'123456');
});
test('link privado do WhatsApp exige destino autorizado e código vigente; nunca usa URL pública',()=>{
 const e={telefone:'+5551999999999',codigo:'123456',mensagem:'Código de teste',envioPermitido:true,expiraEm:new Date(600000).toISOString()};assert.match(uriWhatsappPrivada(e,300000),/^whatsapp:\/\/send\?/);assert.throws(()=>uriWhatsappPrivada({...e,envioPermitido:false},300000));assert.throws(()=>uriWhatsappPrivada(e,600000));assert.throws(()=>uriWhatsappPrivada({...e,expiraEm:'invalido'},300000));
});

test('horários de histórico, validade e auditoria usam o fuso do mandato, inclusive na virada do dia',()=>{assert.match(formatarDataMandato('2026-11-09T04:29:33Z'),/09\/11\/2026.*01:29:33/);assert.equal(formatarDataMandato('2026-11-09T04:34:33Z',true),'01:34:33');assert.equal(formatarDataMandato('invalida'),'Data não informada');assert.equal(formatarDataMandato('2026-11-09'),'09/11/2026');assert.equal(formatarDataMandato('2026-02-31'),'Data não informada');});

test('páginas públicas de homologação preservam fontes e imagens aprovadas na cópia empacotada',async()=>{const hashes=JSON.parse(await readFile(new URL('./telas/manifesto.json',import.meta.url),'utf8'));for(const p of arquivosTelasPublicas){const original=await readFile(new URL('../../'+p,import.meta.url)),pacote=await readFile(new URL('./telas/'+p,import.meta.url));assert.ok(original.equals(pacote));assert.equal(hashes[p],createHash('sha256').update(original).digest('hex'));}});
