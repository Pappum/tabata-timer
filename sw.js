const C = 'tabata-v2.1.0b9';
const A = ['./', 'index.html', 'style.css', 'app.js', 'fonts/figtree.woff2', 'fonts/bebas-neue.woff2', 'manifest.json', 'icon-180.png', 'icon-512.png'];

self.addEventListener('install', e =>
  e.waitUntil(caches.open(C).then(c => c.addAll(A)).then(() => self.skipWaiting())));

self.addEventListener('activate', e =>
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k))))
    .then(() => self.clients.claim())));

self.addEventListener('message', e => e.source.postMessage(C));

self.addEventListener('fetch', e =>
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
