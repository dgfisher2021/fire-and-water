/* Caches the app shell and artwork so the site loads offline.
   Audio (.m4a) and range requests always go to the network — serving cached
   full-body responses to range requests breaks seeking in some browsers. */
var CACHE = 'fire-and-water-v2';
var CORE = [
  '.',
  'index.html',
  'site.webmanifest',
  'assets/pencil.jpg', 'assets/fire.jpg', 'assets/water.jpg',
  'assets/pencil-512.jpg', 'assets/fire-512.jpg', 'assets/water-512.jpg',
  'assets/favicon.png', 'assets/apple-touch-icon.png',
  'assets/icon-192.png', 'assets/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(CORE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE; })
          .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.pathname.slice(-4) === '.m4a' || e.request.headers.get('range')) return;

  // Cache-first for web fonts so typography survives offline
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    e.respondWith(
      caches.match(e.request).then(function (m) {
        return m || fetch(e.request).then(function (r) {
          var copy = r.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
          return r;
        });
      })
    );
    return;
  }

  if (e.request.mode === 'navigate') {
    // Network-first for the page itself so deploys show up immediately
    e.respondWith(
      fetch(e.request)
        .then(function (r) {
          var copy = r.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
          return r;
        })
        .catch(function () {
          return caches.match(e.request).then(function (m) {
            return m || caches.match('index.html');
          });
        })
    );
    return;
  }

  // Cache-first for static assets
  e.respondWith(
    caches.match(e.request).then(function (m) {
      return m || fetch(e.request).then(function (r) {
        if (r.ok && url.origin === location.origin) {
          var copy = r.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return r;
      });
    })
  );
});
