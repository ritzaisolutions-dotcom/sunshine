/* Sunshine service worker — keep HTML fresh; cache only hashed Next assets. */
const STATIC_CACHE = "sunshine-static-v1";
const HTML_CACHE = "sunshine-html-v1";

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== HTML_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/");
}

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

async function networkFirstHtml(request) {
  const cache = await caches.open(HTML_CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) {
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error("Offline and no cached page.");
  }
}

async function cacheFirstStatic(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh.ok) {
    cache.put(request, fresh.clone());
  }
  return fresh;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (!isSameOrigin(url)) return;

  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(networkFirstHtml(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStatic(request));
  }
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "Sunshine",
    body: "Maria has a reminder for you.",
    url: "/todos",
    tag: "sunshine-reminder",
  };
  try {
    if (event.data) {
      const data = event.data.json();
      payload = {
        title: typeof data.title === "string" ? data.title : payload.title,
        body: typeof data.body === "string" ? data.body : payload.body,
        url: typeof data.url === "string" ? data.url : payload.url,
        tag: typeof data.tag === "string" ? data.tag : payload.tag,
      };
    }
  } catch {
    /* keep defaults */
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      renotify: true,
      data: { url: payload.url },
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/todos";
  const absolute = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            await client.navigate(absolute);
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(absolute);
      }
    })()
  );
});
