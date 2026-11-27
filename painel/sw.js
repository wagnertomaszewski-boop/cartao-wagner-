// Service worker exclusivo da instalação Painel do Mandato V17.
// Não compartilha cache nem controla a instalação pública.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const raiz = new URL("../", self.registration.scope);
  if (url.origin !== raiz.origin || !url.pathname.startsWith(raiz.pathname)) return;
  const caminho = url.pathname.slice(raiz.pathname.length);
  const recursoPainel = /^v2\/seguranca\/(?:painel-privado\.mjs|telefone\.mjs|botoes\.css)$/.test(caminho);
  if (e.request.mode === "navigate" || recursoPainel) {
    e.respondWith(fetch(e.request, {cache:"no-store"}));
  }
});
