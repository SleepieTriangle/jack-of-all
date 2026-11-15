/* Jack of All — service worker. Makes the app work offline after the first visit.
   Bump VERSION whenever you ship changes so players get the new files. */
const VERSION = 'v12';
const APP_CACHE = `joa-app-${VERSION}`;
const FONT_CACHE = 'joa-fonts';

const APP_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './css/fonts.css',
  './fonts/fredoka-latin.woff2',
  './fonts/fredoka-latin-ext.woff2',
  './fonts/nunito-latin.woff2',
  './fonts/nunito-latin-ext.woff2',
  './js/core.js',
  './js/app.js',
  './js/install.js',
  './js/social.js',
  './js/badges.js',
  './js/fx.js',
  './js/worker.js',
  './js/games/chess.js',
  './js/games/sudoku.js',
  './js/games/wordProblems.js',
  './js/games/patterns.js',
  './js/games/memory.js',
  './js/games/scramble.js',
  './js/games/colorClash.js',
  './js/games/sliding.js',
  './js/games/lightTrail.js',
  './js/games/quickMath.js',
  './js/games/oddOneOut.js',
  './js/games/numberHunt.js',
  './js/games/shapeSpin.js',
  './js/games/matchBack.js',
  './js/games/oddWord.js',
  './icons/icon.svg',
  './icons/icon-mark.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  // cache: 'reload' skips the browser's HTTP cache so an update never stores stale files.
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((c) => c.addAll(APP_FILES.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => (k.startsWith('joa-app-') && k !== APP_CACHE) || k === FONT_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // fonts are bundled now; nothing else is external

  // Only the app's own page is answered with the cached index.html. Other pages
  // (like /tests/) go to the network as normal.
  const scope = new URL(self.registration.scope).pathname;
  const isAppPage = url.pathname === scope || url.pathname === scope + 'index.html';
  if (req.mode === 'navigate' && !isAppPage) return;

  // App files: serve from cache instantly, refresh the cache in the background.
  event.respondWith(
    caches.open(APP_CACHE).then(async (cache) => {
      const key = req.mode === 'navigate' ? './index.html' : req;
      const hit = await cache.match(key, { ignoreSearch: true });
      const refresh = fetch(req, { cache: 'no-cache' })
        .then((res) => {
          if (res.ok) cache.put(key, res.clone());
          return res;
        })
        .catch(() => null);
      if (hit) {
        event.waitUntil(refresh);
        return hit;
      }
      return (await refresh) || cache.match('./index.html');
    })
  );
});
