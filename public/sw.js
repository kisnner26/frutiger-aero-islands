/* caché del juego: las visitas siguientes cargan al instante y la interfaz sigue abriendo sin conexión.
 * - páginas: red primero (3 s) y, si falla, la copia guardada
 * - archivos con huella (assets/): caché primero, no cambian
 * - dibujos, íconos y demás estáticos: caché al instante y se actualizan detrás
 * no toca el servidor de datos ni el audio (pistas grandes y peticiones por rango). */
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE = `fai-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key.startsWith('fai-') && key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

const withTimeout = (p, ms) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('timeout')), ms);
  p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (req.headers.has('range') || url.pathname.includes('/audio/')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const fresh = await withTimeout(fetch(req), 3000);
          if (fresh.ok) cache.put(req, fresh.clone());
          return fresh;
        } catch {
          return (await cache.match(req)) || (await cache.match(url.pathname)) || (await cache.match(self.registration.scope)) || Response.error();
        }
      })(),
    );
    return;
  }

  const hashed = url.pathname.includes('/assets/') && /-[A-Za-z0-9_-]{8,}\./.test(url.pathname);
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      if (hashed && hit) return hit;
      const refresh = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => undefined);
      if (hit) {
        event.waitUntil(refresh);
        return hit;
      }
      return (await refresh) || Response.error();
    })(),
  );
});
