// Service Worker for family calendar PWA
const CACHE_NAME = 'family-cal-v1'
const STATIC_ASSETS = [
  '/',
  '/today',
  '/manifest.json',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  // Network-first for API calls
  if (event.request.url.includes('/api/')) return

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})

// Push notification handler
self.addEventListener('push', event => {
  if (!event.data) return
  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'לוח שנה משפחתי', body: event.data.text() }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'לוח שנה משפחתי', {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      dir: 'rtl',
      lang: 'he',
      data: payload.data || {},
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/today'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin)) {
          client.focus()
          client.postMessage({ type: 'navigate', url })
          return
        }
      }
      return clients.openWindow(url)
    })
  )
})
