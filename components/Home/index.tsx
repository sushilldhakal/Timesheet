"use client"

import { useCallback, useEffect, useState } from "react"
import { useOfflinePinValidation } from "@/lib/hooks/use-offline-pin-validation"

function formatTime12hr(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}
import { PinDisplay } from "@/components/Home/PinDisplay"
import { Numpad } from "@/components/Home/Numpad"
import { cn } from "@/lib/utils"

const PIN_LENGTH = 4
const HOME_BG = "min-h-dvh bg-dark"
export function Home() {
  const [pin, setPin] = useState("")
  const [time12, setTime12] = useState(() => formatTime12hr(new Date()))
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Use offline-capable PIN validation
  const { status, errorMessage, isOnline, verifyPin } = useOfflinePinValidation()

  // Clear any stale session data when PIN page loads
  useEffect(() => {
    try {
      sessionStorage.removeItem("clock_employee")
    } catch (err) {
      console.warn("Failed to clear session storage:", err)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setTime12(formatTime12hr(new Date()))
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Get user location on mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.warn("Location access denied or unavailable:", error)
          // Continue without location - backend will handle accordingly
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      )
    }
  }, [])

  // Auto-clear PIN after error timeout
  useEffect(() => {
    if (status === "error") {
      const timer = setTimeout(() => {
        setPin("")
      }, 2000) // Clear PIN after 2 seconds of showing error
      
      return () => clearTimeout(timer)
    }
  }, [status])

  const verifyPinCallback = useCallback(async (enteredPin: string) => {
    await verifyPin(enteredPin, userLocation || undefined)
  }, [verifyPin, userLocation])

  const handleKeyPress = useCallback(
    (key: string) => {
      if (status !== "idle") return
      if (pin.length >= PIN_LENGTH) return

      // Only allow digits
      if (!/^\d$/.test(key)) return

      const newPin = pin + key
      setPin(newPin)

      if (newPin.length === PIN_LENGTH) {
        verifyPinCallback(newPin)
      }
    },
    [pin, status, verifyPinCallback]
  )

  const handleDelete = useCallback(() => {
    if (status !== "idle") return
    setPin((prev) => prev.slice(0, -1))
  }, [status])

  const handleClear = useCallback(() => {
    if (status !== "idle") return
    setPin("")
  }, [status])

  if (status === "success") {
    return (
      <div className={cn("relative flex flex-col items-center px-6 pb-8 pt-16", HOME_BG)}>
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-2xl font-bold text-white text-balance tabular-nums">
              {time12}
            </h1>
            <p className="text-sm text-white/70">
              Enter your PIN
            </p>
          </div>

          {/* PIN Display - Success State */}
          <div className="mt-4">
            <PinDisplay value={pin} maxLength={PIN_LENGTH} status={status} />
          </div>

          {/* Success message */}
          <div className="h-6">
            <p className="text-sm text-emerald-400 font-medium animate-in fade-in duration-200">
              ✓ Verified! Loading...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("relative flex flex-col items-center px-6 pb-8 pt-16", HOME_BG)}>
      <div className="flex flex-col items-center gap-6">
      
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-bold text-white text-balance tabular-nums">
            {time12}
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-sm text-white/70">
              Enter your PIN
            </p>
            {/* Offline indicator */}
            {!isOnline && (
              <div className="flex items-center gap-1 text-xs text-orange-400">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0 0L12 12m-6.364 6.364L12 12m6.364-6.364L12 12" />
                </svg>
                Offline
              </div>
            )}
          </div>
        </div>

        {/* PIN Display */}
        <div className="mt-4">
          <PinDisplay value={pin} maxLength={PIN_LENGTH} status={status} />
        </div>

        {/* Status messages */}
        <div className="h-6">
          {status === "verifying" && (
            <p className="animate-pulse text-sm text-white/90">Verifying...</p>
          )}
          {status === "error" && errorMessage && (
            <p className={cn("text-sm text-red-400 animate-in fade-in duration-200")}>
              {errorMessage}
            </p>
          )}
        </div>
      </div>

      {/* Numpad */}
      <div className="w-full max-w-lg">
        <Numpad
          onKeyPress={handleKeyPress}
          onDelete={handleDelete}
          onClear={handleClear}
          disabled={status === "verifying" || status === "error"}
        />
      </div>
    </div>
  )
}
