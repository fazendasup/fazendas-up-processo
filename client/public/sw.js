/**
 * Service worker mínimo para habilitar instalação PWA.
 * Não faz cache agressivo de API nem de bundles — evita dados/versões antigas presas.
 */
const SW_VERSION = "fazendas-up-pwa-v2";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== SW_VERSION).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API, tRPC e config runtime sempre vão direto à rede.
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open(SW_VERSION);
      return cache.match(request);
    }),
  );
});
