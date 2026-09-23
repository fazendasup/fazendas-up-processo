/**
 * Service worker — PWA + Web Push.
 * Não faz cache agressivo de API nem de bundles — evita dados/versões antigas presas.
 */
const SW_VERSION = "fazendas-up-pwa-v3";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== SW_VERSION).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open(SW_VERSION);
      return cache.match(request);
    }),
  );
});

self.addEventListener("push", (event) => {
  let data = {
    titulo: "Fazendas UP",
    corpo: "Nova notificação",
    url: "/",
    tag: "fazendas-up",
    categoria: "",
  };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = {
        titulo: parsed.titulo || data.titulo,
        corpo: parsed.corpo || data.corpo,
        url: parsed.url || data.url,
        tag: parsed.tag || parsed.categoria || data.tag,
        categoria: parsed.categoria || "",
      };
    }
  } catch {
    try {
      const text = event.data?.text();
      if (text) data.corpo = text;
    } catch {
      /* ignore */
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.titulo, {
      body: data.corpo,
      icon: "/pwa-icon-192.png?v=6",
      badge: "/pwa-icon-192.png?v=6",
      tag: data.tag,
      data: { url: data.url, categoria: data.categoria },
      renotify: true,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/";
  const abs = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clientsList) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(abs);
            } catch {
              /* ignore */
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(abs);
      }
    })(),
  );
});
