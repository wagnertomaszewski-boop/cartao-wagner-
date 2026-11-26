// Usa a mesma biblioteca e centro inicial da V2 existente. Nenhuma coordenada é arredondada.
export function pontoValido(lat,lng){return typeof lat==='number'&&typeof lng==='number'&&Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180;}
export function criarSelecaoLocalizacao(){let ponto=null,geracao=0;return {
 iniciarGps(){return ++geracao;},cancelarGps(){geracao++;},
 gps(token,coords){if(token!==geracao)return false;if(!pontoValido(coords.latitude,coords.longitude))throw Error('Localização inválida.');ponto={latitude:coords.latitude,longitude:coords.longitude,localizacaoOrigem:'gps',...(Number.isFinite(coords.accuracy)&&coords.accuracy>=0?{precisaoMetros:coords.accuracy}:{})};return true;},
 mapa(latitude,longitude){if(!pontoValido(latitude,longitude))throw Error('Ponto inválido.');geracao++;ponto={latitude,longitude,localizacaoOrigem:'mapa'};},
 ler(){return ponto?{...ponto}:null;},limpar(){geracao++;ponto=null;}
};}
export function montarMapaPrivado(elemento,ponto=null,aoEscolher=null){if(!globalThis.L)throw Error('Mapa indisponível. Você pode enviar sem localização.');const inicial=ponto&&pontoValido(ponto.latitude,ponto.longitude)?[ponto.latitude,ponto.longitude]:[-31.0046,-52.0436];const mapa=L.map(elemento,{scrollWheelZoom:false}).setView(inicial,ponto?16:12);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors',referrerPolicy:'origin'}).addTo(mapa);let marcador=null;function marcar(lat,lng){if(marcador)marcador.setLatLng([lat,lng]);else marcador=L.circleMarker([lat,lng],{radius:9,color:'#064a85',fillColor:'#0868bd',fillOpacity:1}).addTo(mapa);}
 if(ponto)marcar(...inicial);if(aoEscolher)mapa.on('click',e=>{marcar(e.latlng.lat,e.latlng.lng);aoEscolher(e.latlng.lat,e.latlng.lng);});return {remover:()=>mapa.remove()};}
