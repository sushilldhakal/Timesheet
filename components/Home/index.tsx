"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/lib/utils/toast"

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
import { HOME_BG } from "@/lib/constants"

const PIN_LENGTH = 4

type Status = "idle" | "verifying" | "error" | "success"

export function Home() {
  const router = useRouter()
  const [pin, setPin] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [time12, setTime12] = useState(() => formatTime12hr(new Date()))
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

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

  const verifyPin = useCallback(async (enteredPin: string) => {
    setStatus("verifying")
    setErrorMessage("")

    try {
      const payload: { pin: string; lat?: number; lng?: number } = { pin: enteredPin }
      
      // Add location if available
      if (userLocation) {
        payload.lat = userLocation.lat
        payload.lng = userLocation.lng
      }

      const res = await fetch("/api/employee/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (res.ok) {
        try {
          sessionStorage.setItem("clock_employee", JSON.stringify({
            employee: data.employee,
            punches: data.punches ?? { clockIn: "", breakIn: "", breakOut: "", clockOut: "" },
            location: userLocation, // Store the verified location coordinates
            isBirthday: data.isBirthday ?? false, // Store birthday flag
            detectedLocation: data.detectedLocation, // Store which location they're at
          }))
        } catch {}
        
        // Show warning toast if outside geofence but soft mode enabled
        if (data.geofenceWarning) {
          toast.warning({
            title: "Location Warning",
            description: "You are outside the designated work location. Your manager will be notified.",
            duration: 6000,
          })
        }
        
        // Show success state for 1.5 seconds before navigating
        setStatus("success")
        setTimeout(() => {
          router.replace("/clock")
        }, 1500)
        return
      }

      // Handle geofence violation
      if (res.status === 403 && data.geofenceViolation) {
        setStatus("error")
        setErrorMessage(data.error)
        toast.error({
          title: "Location Error",
          description: data.error,
          duration: 6000,
        })
        setTimeout(() => {
          setPin("")
          setStatus("idle")
          setErrorMessage("")
        }, 4000)
        return
      }

      setStatus("error")
      setErrorMessage(data.error ?? "Invalid PIN. Please try again.")
      setTimeout(() => {
        setPin("")
        setStatus("idle")
        setErrorMessage("")
      }, 800)
    } catch {
      setStatus("error")
      setErrorMessage("Network error. Please try again.")
      setTimeout(() => {
        setPin("")
        setStatus("idle")
        setErrorMessage("")
      }, 800)
    }
  }, [router, userLocation])

  const handleKeyPress = useCallback(
    (key: string) => {
      if (status !== "idle") return
      if (pin.length >= PIN_LENGTH) return

      // Only allow digits
      if (!/^\d$/.test(key)) return

      const newPin = pin + key
      setPin(newPin)

      if (newPin.length === PIN_LENGTH) {
        verifyPin(newPin)
      }
    },
    [pin, status, verifyPin]
  )

  const handleDelete = useCallback(() => {
    if (status !== "idle") return
    setPin((prev) => prev.slice(0, -1))
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
          <p className="text-sm text-white/70">
            Enter your PIN
          </p>
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
      <div className="w-full max-w-sm">
        <Numpad
          onKeyPress={handleKeyPress}
          onDelete={handleDelete}
          disabled={status === "verifying" || status === "error"}
        />
      </div>
    </div>
  )
}
