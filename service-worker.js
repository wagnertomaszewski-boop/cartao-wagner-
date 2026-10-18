const CACHE_NAME = "wagner-app-v5-agenda";

const ARQUIVOS = [
  "./",
  "./index.html",
  "./solicitacao.html",
  "./acompanhar.html",
  "./agenda.html",
  "./projetos.html",
  "./enquetes.html",
  "./cartao-wagner.jpg",
  "./manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ARQUIVOS))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("wagner-app-")&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
