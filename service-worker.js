const CACHE_NAME = "wagner-app-v8-consulta-v2";
const ARQUIVOS_PUBLICOS = [
  "./", "./index.html", "./agenda.html", "./projetos.html",
  "./enquetes.html", "./cartao-wagner.jpg", "./manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME).catch(() => null);
    if (cache) {
      await Promise.allSettled(ARQUIVOS_PUBLICOS.map(arquivo =>
        cache.add(new Request(new URL(arquivo, self.registration.scope), { cache: "reload" }))
      ));
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    await self.clients.claim();
    const antigos = (await caches.keys()).filter(nome =>
      nome.startsWith("wagner-app-") && nome !== CACHE_NAME
    );
    await Promise.allSettled(antigos.map(nome => caches.delete(nome)));
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  const escopo = new URL(self.registration.scope);
  if (request.method !== "GET" || url.origin !== escopo.origin ||
      !url.pathname.startsWith(escopo.pathname)) return;

  const relativo = url.pathname.slice(escopo.pathname.length);
  const privado = (request.mode === "navigate" && /^(?:v2|v2\/(?:index\.html)?)$/.test(relativo)) || /^(?:solicitacao|acompanhar)\.html$/.test(relativo) ||
    relativo.startsWith("mandato-seguro/") || relativo.startsWith("v2/seguranca/");
  if (privado) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }
  const publico = ARQUIVOS_PUBLICOS.includes("./" + relativo);
  if (publico) {
    event.respondWith(fetch(request, { cache: "no-cache" }).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      return await cache.match(request) || Response.error();
    }));
  }
});
