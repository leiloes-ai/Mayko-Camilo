const CACHE_NAME = 'gestorpro-cache-v1.23.3';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './index.css',
  './index.tsx',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

const STATIC_ASSETS_EXTENSIONS = [
  '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.otf', '.ico'
];

const EXTERNAL_STATIC_DOMAINS = [
  'esm.sh',
  'cdn.tailwindcss.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'www.gstatic.com'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Pre-caching assets ativos...');
      return cache.addAll(PRECACHE_ASSETS).catch(err => {
        console.warn('SW: Pre-cache parcial (alguns itens falharam, mas o core está ativo)', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Limpando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Ignora chamadas de autenticação do Firebase e Firestore Realtime
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('firebase')) {
    return;
  }

  const isStaticAsset = STATIC_ASSETS_EXTENSIONS.some(ext => url.pathname.endsWith(ext)) || 
                        EXTERNAL_STATIC_DOMAINS.some(domain => url.hostname.includes(domain));

  // Estratégia para Assets Estáticos: Cache First
  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) return networkResponse;
          
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        }).catch(() => caches.match(event.request));
      })
    );
    return;
  }

  // Estratégia para Navegação: Network First com fallback para index.html
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse.status === 200 && event.request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return null;
        });
      })
  );
});