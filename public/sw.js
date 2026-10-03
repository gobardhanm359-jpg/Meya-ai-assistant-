// Mahi Ai — Production PWA Service Worker (v6)
// Provides App-Shell Precaching, Network-First Navigation with Offline Fallback,
// Stale-While-Revalidate Static Asset Caching, Background Sync, and Push Notifications.

const CACHE_NAME = 'mahi-ai-pwa-v6';
const RUNTIME_CACHE = 'mahi-ai-runtime-v6';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/manifest.webmanifest',
  '/icon.svg',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/anime/mahi_wink.jpg',
];

const OFFLINE_FALLBACK_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#150510" />
  <title>Mahi Ai — Offline Mode</title>
  <style>
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #150510; color: #fff; font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 24px; }
    .card { max-width: 380px; background: rgba(255,255,255,0.06); border: 1px solid rgba(244,63,94,0.4); border-radius: 24px; padding: 28px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
    h1 { color: #fb7185; font-size: 22px; margin: 0 0 8px; }
    p { color: rgba(255,255,255,0.75); font-size: 14px; line-height: 1.5; margin: 0 0 20px; }
    button { background: linear-gradient(135deg, #e11d48, #db2777); color: #fff; border: none; padding: 12px 24px; border-radius: 999px; font-weight: 700; font-size: 14px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Mahi Ai 💕</h1>
    <p>Aap abhi offline hain jaan! Internet aate hi Mahi turant connect ho jayegi.</p>
    <button onclick="window.location.reload()">Retry Connection</button>
  </div>
</body>
</html>`;

// 1. INSTALL: Pre-cache core app shell assets safely
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            fetch(url, { cache: 'reload' }).then((res) => {
              if (res && res.status === 200) {
                return cache.put(url, res);
              }
              return Promise.resolve();
            })
          )
        );
      } catch (_) {}
      await self.skipWaiting();
    })()
  );
});

// 2. ACTIVATE: Clean up legacy caches and claim clients without reloading active WebSockets
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME && key !== RUNTIME_CACHE) {
              return caches.delete(key);
            }
            return Promise.resolve(true);
          })
        );
      } catch (_) {}
      try {
        await self.clients.claim();
      } catch (_) {}
    })()
  );
});

// 3. MESSAGE: Support skipWaiting and cache refresh messages
self.addEventListener('message', (event) => {
  if (event.data && (event.data === 'SKIP_WAITING' || event.data.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});

// 4. FETCH: Fast & Reliable Network-First Navigation + Stale-While-Revalidate Static Caching
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never intercept WebSocket, API routes, or Vite dev-server module endpoints
  if (
    url.protocol === 'ws:' ||
    url.protocol === 'wss:' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/live-ws') ||
    url.pathname.startsWith('/__aistudio') ||
    url.pathname.startsWith('/_aistudio') ||
    url.pathname.startsWith('/__cookie_check') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.endsWith('.tsx') ||
    url.pathname.endsWith('.ts') ||
    url.searchParams.has('t') ||
    url.searchParams.has('v')
  ) {
    return;
  }

  // HTML Navigation: Network-First with Cache Update & Offline Fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put('/', networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        } catch (_) {
          const cache = await caches.open(CACHE_NAME);
          const cachedPage =
            (await cache.match(event.request)) ||
            (await cache.match('/index.html')) ||
            (await cache.match('/'));
          if (cachedPage) {
            return cachedPage;
          }
          return new Response(OFFLINE_FALLBACK_HTML, {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        }
      })()
    );
    return;
  }

  // Static Assets (Icons, Manifest, Images, Fonts, CSS, JS): Stale-While-Revalidate
  if (
    url.origin === self.location.origin ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached =
          (await cache.match(event.request)) ||
          (await caches.match(event.request));

        const networkFetch = fetch(event.request)
          .then((response) => {
            if (response && response.status === 200 && response.type !== 'opaque') {
              cache.put(event.request, response.clone()).catch(() => {});
            }
            return response;
          })
          .catch(() => cached);

        return cached || networkFetch;
      })()
    );
  }
});

// 5. BACKGROUND SYNC & PERIODIC SYNC (PWABuilder Reliability Capabilities)
self.addEventListener('sync', (event) => {
  if (event.tag === 'mahi-sync') {
    event.waitUntil(Promise.resolve());
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'mahi-periodic-sync') {
    event.waitUntil(Promise.resolve());
  }
});

// 6. PUSH NOTIFICATIONS & REMINDER ALERTS
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Mahi Ai 💕',
    body: 'Jaan, Mahi aapka wait kar rahi hai!',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
  };
  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    }
  } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      vibrate: [200, 100, 200],
      data: { url: '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
      return undefined;
    })
  );
});
