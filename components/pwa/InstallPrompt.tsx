"use client"

import { useState, useEffect } from "react"
import { X, Smartphone, Share } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * PWA Install prompt - shows instructions for adding to home screen.
 * Hidden when app is already installed (standalone mode).
 */
export function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<{
    prompt: () => Promise<{ outcome: string }>
  } | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: boolean }).MSStream)
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as { standalone?: boolean }).standalone === true
    )

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as unknown as { prompt: () => Promise<{ outcome: string }> })
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      setDeferredPrompt(null)
    }
  }

  if (isStandalone || dismissed) return null

  return (
    <div
      role="banner"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-lg border border-blue-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900 md:left-6"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-slate-800">
            <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-100">Install Timesheet</p>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
              Add to home screen for quick access and app-like experience.
            </p>
            {isIOS && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Share className="h-3.5 w-3.5" />
                Tap Share, then &quot;Add to Home Screen&quot;
              </p>
            )}
            {!isIOS && deferredPrompt && (
              <Button size="sm" className="mt-2" onClick={handleInstall}>
                Install
              </Button>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
