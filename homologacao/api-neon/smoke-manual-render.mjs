import assert from 'node:assert/strict';
import {setTimeout as esperar} from 'node:timers/promises';
const base='https://mandato-neon-homologacao.onrender.com';
const headers={Origin:base,'Content-Type':'application/json'};
async function get(path){return fetch(base+path,{redirect:'error',signal:AbortSignal.timeout(15000)});}
let pronto=false;
for(let i=0;i<60;i++){
 try{const r=await get('/hml/api/estado');const e=await r.json();if(e.ambiente==='homologacao'&&e.envioManual===true&&e.manualNeonValidado===true){pronto=true;break;}}catch{}
 await esperar(5000);
}
assert.ok(pronto,'Implantação manual e autoteste Neon real não confirmados em cinco minutos');
const health=await get('/health');assert.equal(health.status,200);const h=await health.json();assert.equal(h.modo,'homologacao');assert.equal(h.rotasCidadaoHabilitadas,false);
assert.equal((await get('/api/admin/recuperacoes')).status,410,'Rota legada precisa permanecer removida');
assert.equal((await get('/hml/manual/pedidos')).status,401,'Lista deve exigir autenticação');
for(const path of ['/hml/painel-recuperacao','/hml/recuperar']){const r=await get(path);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');}
const sem=await fetch(base+'/hml/manual/fixture',{method:'POST',headers,body:'{}'});assert.equal(sem.status,401);
const cross=await fetch(base+'/hml/manual/solicitar',{method:'POST',headers:{...headers,Origin:'https://origem-invalida.example'},body:'{}'});assert.equal(cross.status,403);
const neutro=await fetch(base+'/hml/manual/solicitar',{method:'POST',headers,body:JSON.stringify({protocolo:'HML-00000000-0000-0000-0000-000000000000',telefone:'+5551000000000'})});assert.equal(neutro.status,200);assert.equal((await neutro.json()).recebido,true);
console.log('RENDER_MANUAL_REAL_OK: implantação manual; prova Neon; páginas 200/no-store; admin 401; legado 410; origem externa 403; resposta cidadã neutra. Sem mensagens externas.');
