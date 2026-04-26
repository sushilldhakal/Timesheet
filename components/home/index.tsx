"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useOfflinePinValidation } from "@/lib/hooks/use-offline-pin-validation"
import { useDeviceAuthContext } from "@/lib/context/device-auth-context"
import { PinDisplay } from "@/components/home/PinDisplay"
import { Numpad } from "@/components/home/Numpad"
import { cn } from "@/lib/utils/cn"

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

const PIN_LENGTH = 4

export function Home() {
  const [pin, setPin] = useState("")
  const [time, setTime] = useState(() => formatTime(new Date()))
  const [date, setDate] = useState(() => formatDate(new Date()))
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [shakeKey, setShakeKey] = useState(0)
  const isMountedRef = useRef(true)

  const { status, errorMessage, isOnline, verifyPin } = useOfflinePinValidation()
  const { deviceInfo } = useDeviceAuthContext()

  useEffect(() => {
    try { sessionStorage.removeItem("clock_employee") } catch {}
  }, [])

  useEffect(() => {
    const i = setInterval(() => {
      const now = new Date()
      setTime(formatTime(now))
      setDate(formatDate(now))
    }, 1000)
    return () => clearInterval(i)
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!("geolocation" in navigator)) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!isMountedRef.current) return
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      (err) => console.warn("Location unavailable:", err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [])

  useEffect(() => {
    if (status === "error") {
      setShakeKey((k) => k + 1)
      const t = setTimeout(() => setPin(""), 2000)
      return () => clearTimeout(t)
    }
  }, [status])

  const verifyPinCallback = useCallback(async (enteredPin: string) => {
    await verifyPin(enteredPin, userLocation || undefined)
  }, [verifyPin, userLocation])

  const handleKeyPress = useCallback((key: string) => {
    if (status !== "idle") return
    if (pin.length >= PIN_LENGTH) return
    if (!/^\d$/.test(key)) return
    const newPin = pin + key
    setPin(newPin)
    if (newPin.length === PIN_LENGTH) verifyPinCallback(newPin)
  }, [pin, status, verifyPinCallback])

  const handleDelete = useCallback(() => {
    if (status !== "idle") return
    setPin((prev) => prev.slice(0, -1))
  }, [status])

  const handleClear = useCallback(() => {
    if (status !== "idle") return
    setPin("")
  }, [status])

  const statusMessage =
    status === "error" ? (errorMessage || "Incorrect PIN. Try again.") :
    status === "success" ? "✓ Verified! Loading..." :
    status === "verifying" ? "Verifying..." :
    !isOnline ? "Offline mode" :
    "Use your 4-digit kiosk PIN"
  return (
    <div className="pin-screen fixed inset-0 bg-[#07080d] overflow-hidden touch-manipulation select-none">

      {/* Background art */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="pin-glow-a absolute rounded-full opacity-50"
          style={{
            top: "-25vmax", left: "-15vmax",
            width: "70vmax", height: "70vmax",
            filter: "blur(90px)",
            mixBlendMode: "screen",
            background: "radial-gradient(circle, rgba(110,231,255,0.7), transparent 60%)",
          }}
        />
        <div
          className="pin-glow-b absolute rounded-full opacity-35"
          style={{
            bottom: "-30vmax", right: "-20vmax",
            width: "70vmax", height: "70vmax",
            filter: "blur(90px)",
            mixBlendMode: "screen",
            background: "radial-gradient(circle, rgba(183,148,255,0.55), transparent 60%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.07) 1px, transparent 1px)," +
              "linear-gradient(to bottom, rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          }}
        />
      </div>

      {/* Page layout */}
      <div className="relative z-10 flex flex-col h-dvh">

        {/* Top bar */}
        <header className="shrink-0 flex items-center justify-between px-6 pt-5 pb-0 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl grid place-items-center border border-white/20 bg-white/5 text-cyan-400 shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-lg font-semibold text-white truncate leading-tight">
                {deviceInfo?.deviceName ?? "Terminal"}
              </div>
              <div className="text-[14px] text-white/45 leading-tight truncate">
                {deviceInfo?.locationName ?? "Kiosk"}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="font-mono text-lg font-semibold text-white tabular-nums leading-tight">{time}</div>
            <div className="text-[14px] text-white/45 uppercase tracking-[0.08em] leading-tight">{date}</div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 sm:gap-7 px-4 py-2 overflow-y-auto">

          {/* Heading */}
          <div className="text-center">
            <p className="text-xs text-white/45 uppercase tracking-[0.12em]">
              Sign in to continue
            </p>
            <h1 className="text-[clamp(1.75rem,5vmin,3rem)] font-semibold text-white tracking-tight leading-tight">
              Enter your PIN
            </h1>
            <p className={cn(
              "text-sm mt-2 min-h-5 leading-tight transition-colors duration-200",
              status === "error" && "text-red-400 font-medium",
              status === "success" && "text-emerald-400",
              status === "verifying" && "text-white/50 animate-pulse",
              status === "idle" && !isOnline && "text-orange-400",
              status === "idle" && isOnline && "text-white/45",
            )}>
              {statusMessage}
            </p>
          </div>

          {/* PIN display */}
          <PinDisplay key={shakeKey} value={pin} maxLength={PIN_LENGTH} status={status} />

          {/* Numpad */}
          <Numpad
            onKeyPress={handleKeyPress}
            onDelete={handleDelete}
            onClear={handleClear}
            disabled={status !== "idle"}
          />
        </main>

        {/* Bottom bar */}
        <footer className="shrink-0 flex items-center justify-between flex-wrap gap-3 px-6 pb-5 pt-2">
         
          <p className="text-xs text-white/25 tracking-wide">PIN forgotten? Ask manager.</p>
        </footer>
      </div>
    </div>
  )
}