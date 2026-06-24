const CACHE = 'gabarys-v1'

self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  if (new URL(e.request.url).pathname.startsWith('/api/')) return

  e.respondWith(
    caches.open(CACHE).then(cache =>
      fetch(e.request)
        .then(res => {
          if (res.ok && res.type !== 'opaque') cache.put(e.request, res.clone())
          return res
        })
        .catch(() => cache.match(e.request))
    )
  )
})
