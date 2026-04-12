/* eslint-disable no-restricted-globals */
const CACHE_VERSION = 'v1';
const CACHE_NAMES = {
  html: `html-cache-${CACHE_VERSION}`,
  js: `js-cache-${CACHE_VERSION}`,
  css: `css-cache-${CACHE_VERSION}`,
  images: `image-cache-${CACHE_VERSION}`,
  products: `product-cache-${CACHE_VERSION}`,
  api: `api-cache-${CACHE_VERSION}`,
  fonts: `font-cache-${CACHE_VERSION}`,
};

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key.includes(CACHE_VERSION) ? null : caches.delete(key))))
    )
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, CACHE_NAMES.html));
    return;
  }

  if (url.pathname.endsWith('.js')) {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.js));
    return;
  }

  if (url.pathname.endsWith('.css')) {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.css));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, CACHE_NAMES.api, 300));
    return;
  }

  if (url.pathname.includes('/products/')) {
    event.respondWith(networkFirst(request, CACHE_NAMES.products, 86400));
    return;
  }

  if (url.pathname.match(/\.(png|jpg|jpeg|webp|svg|gif)$/)) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.images, 2592000));
    return;
  }

  if (url.pathname.match(/\.(woff|woff2|ttf|otf)$/)) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.fonts, 31536000));
    return;
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  cache.put(request, response.clone());
  return response;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((response) => {
    cache.put(request, response.clone());
    return response;
  });
  return cached || fetchPromise;
}
