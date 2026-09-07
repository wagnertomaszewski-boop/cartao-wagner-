const CACHE_NAME = "wagner-app-v2";

const ARQUIVOS = [
  "./",
  "./index.html",
  "./solicitacao.html",
  "./acompanhar.html",
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
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
