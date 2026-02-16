"use client"

import { useEffect } from "react"

/**
 * Registers the service worker for PWA.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        if (reg.installing) {
          console.log("[PWA] Service worker installing")
        } else if (reg.waiting) {
          console.log("[PWA] Service worker waiting")
        } else if (reg.active) {
          console.log("[PWA] Service worker active")
        }
      })
      .catch((err) => {
        console.warn("[PWA] Service worker registration failed:", err)
      })
  }, [])

  return null
}
