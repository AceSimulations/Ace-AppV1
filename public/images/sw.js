self.addEventListener('install', e=> {
  e.waitUntil(
    caches.open('static').then(cache => {
      return cache.addAll(["/", "favicon.png", ""])
    })
  )
})

self.addEventListener('fetch', e => {
  console.log(`Intercepting fetch for: ${e.request.url}`)
})