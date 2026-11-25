// sw.js — offline app shell (book files already live in IndexedDB)
const CACHE = 'qari-shell-v-114';
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
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok && e.request.url.startsWith(self.location.origin)) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => hit))
  );
});
