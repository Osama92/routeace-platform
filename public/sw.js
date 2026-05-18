// RouteAce service worker — production only, handles offline + web push.
// Registered exclusively in production builds outside iframes/preview hosts
// by src/lib/pwa.ts. Cache strategy:
//   - Navigations: NetworkFirst with offline fallback to cached shell.
//   - Static build assets (/assets/*, JS/CSS/woff*/images): StaleWhileRevalidate.
//   - Driver app (/driver*) and public tracking (/track*, /public-tracking*)
//     are prioritized for offline support: their shell + assets are cached
//     on first visit so they keep working with no connectivity.
//   - API/Supabase requests: never cached.

const SHELL_CACHE = 'routeace-shell-v2';
const ASSET_CACHE = 'routeace-assets-v2';
const OFFLINE_URL = '/offline.html';

const SHELL_URLS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/og-image.png',
  OFFLINE_URL,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((c) => c.addAll(SHELL_URLS).catch(() => null))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE)
        .map((k) => caches.delete(k)),
    );
    await self.clients.claim();
  })());
});

// Helpers
function isNavigation(req) {
  return req.mode === 'navigate' ||
    (req.method === 'GET' && req.headers.get('accept')?.includes('text/html'));
}

function isStaticAsset(url) {
  if (url.pathname.startsWith('/assets/')) return true;
  return /\.(?:js|mjs|css|woff2?|ttf|otf|png|jpg|jpeg|svg|gif|webp|ico)$/i.test(url.pathname);
}

function isOfflineFirstRoute(url) {
  // Driver app + tracking app: must keep working offline.
  return (
    url.pathname.startsWith('/driver') ||
    url.pathname.startsWith('/track') ||
    url.pathname.startsWith('/public-tracking')
  );
}

function isApiOrSupabase(url) {
  if (url.pathname.startsWith('/~oauth')) return true;
  if (url.pathname.startsWith('/api/')) return true;
  if (url.hostname.endsWith('.supabase.co')) return true;
  if (url.hostname.endsWith('.supabase.in')) return true;
  return false;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== self.location.origin && !isStaticAsset(url)) return;
  if (isApiOrSupabase(url)) return;

  // Navigations: NetworkFirst, fall back to cached route, then offline page.
  if (isNavigation(req)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const copy = fresh.clone();
        caches.open(SHELL_CACHE).then((c) => c.put(req, copy)).catch(() => null);
        return fresh;
      } catch {
        const cached = await caches.match(req);
        if (cached) return cached;
        // Offline-first routes: serve cached SPA shell so React can hydrate
        // and read locally cached data.
        if (isOfflineFirstRoute(url)) {
          const shell = await caches.match('/');
          if (shell) return shell;
        }
        const fallback = await caches.match(OFFLINE_URL);
        return fallback || new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })());
    return;
  }

  // Static assets: StaleWhileRevalidate
  if (isStaticAsset(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(ASSET_CACHE);
      const cached = await cache.match(req);
      const network = fetch(req).then((res) => {
        if (res && res.status === 200) cache.put(req, res.clone()).catch(() => null);
        return res;
      }).catch(() => cached);
      return cached || network;
    })());
  }
});

self.addEventListener('push', (event) => {
  let data = { title: 'RouteAce', body: 'You have an update', url: '/' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/og-image.png',
      badge: '/favicon.ico',
      tag: data.tag || 'routeace',
      data: { url: data.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = all.find((c) => c.url.includes(self.location.origin));
    if (existing) { existing.focus(); existing.navigate(url); return; }
    self.clients.openWindow(url);
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
