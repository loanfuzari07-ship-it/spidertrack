const CACHE_NAME = "spidertrack-shell-v1";
const SHELL_URLS = ["/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

// Network-first: nunca serve dados de dashboard/API do cache (são sensíveis e
// mudam a todo momento). O cache aqui só cobre o "app shell" estático,
// evitando tela em branco em quedas rápidas de conexão.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && SHELL_URLS.includes(url.pathname)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Notificação push (venda aprovada etc.) — chega mesmo com o app fechado,
// porque quem entrega é o navegador/SO, não uma aba aberta. O corpo vem em
// JSON de `src/lib/push/send.ts` ({ title, body, url }); se por algum motivo
// vier vazio ou em outro formato, cai num aviso genérico em vez de falhar
// silenciosamente (uma notificação sem showNotification() pode fazer o
// navegador reclamar/desconfiar de pushes futuros).
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "SpiderTrack", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "SpiderTrack";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Toque na notificação: foca uma aba já aberta no destino, ou abre uma nova.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
      })
  );
});
