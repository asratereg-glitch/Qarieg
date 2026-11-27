// sw.js — offline app shell (book files already live in IndexedDB)
const CACHE = 'qari-shell-v-154';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './css/styles.css',
  './js/app.bundle.js',
  './js/vendor/jszip.min.js', './js/vendor/epub.min.js', './js/vendor/pdf.min.js', './js/vendor/pdf.worker.min.js',
  './fonts/amiri-arabic-400-normal.woff2', './fonts/amiri-arabic-700-normal.woff2',
  './fonts/cairo-arabic-400-normal.woff2', './fonts/cairo-arabic-600-normal.woff2', './fonts/cairo-arabic-700-normal.woff2',
  ...['noto-naskh-arabic','scheherazade-new','lateef','markazi-text','el-messiri','tajawal','almarai','noto-kufi-arabic'].flatMap(p => [400, 700].map(w => './fonts/' + p + '-arabic-' + w + '-normal.woff2')),
  './fonts/lora-latin-400-normal.woff2', './fonts/lora-latin-700-normal.woff2',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ASSETS.map(a => fetch(a, { cache: 'reload' }).then(r => { if (r.ok) return c.put(a, r); })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const sameOrigin = url.origin === self.location.origin;
  const code = sameOrigin && (e.request.mode === 'navigate' || /\.(js|css|html|webmanifest)$/.test(url.pathname) || url.pathname.endsWith('/'));
  if (code) {
    // network first for app code so a new version always wins; cache is the offline fallback
    e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request).then(h => h || caches.match('./index.html'))));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok && sameOrigin) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => hit))
  );
});
