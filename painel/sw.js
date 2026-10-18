// Service worker exclusivo da instalação Painel do Mandato V17.
// Não compartilha cache nem controla a instalação pública.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  if (e.request.mode === "navigate") e.respondWith(fetch(e.request, {cache:"no-store"}));
});
