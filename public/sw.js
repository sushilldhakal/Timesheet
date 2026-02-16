/* Timesheet PWA Service Worker */

self.addEventListener("install", function () {
  self.skipWaiting()
})

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim())
})

/* Fetch handler required for Chrome Android install prompt */
self.addEventListener("fetch", function (event) {
  event.respondWith(fetch(event.request))
})
