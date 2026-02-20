/* Timesheet PWA Service Worker */

self.addEventListener("install", function () {
  self.skipWaiting()
})

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim())
})

/* No fetch handler needed - we don't cache API requests.
 * The install prompt works without intercepting fetches.
 */
