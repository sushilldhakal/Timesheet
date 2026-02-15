"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

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

type Status = "idle" | "verifying" | "error" | "success"

export function Home() {
  const router = useRouter()
  const [pin, setPin] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [time12, setTime12] = useState(() => formatTime12hr(new Date()))

  useEffect(() => {
    const interval = setInterval(() => {
      setTime12(formatTime12hr(new Date()))
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    router.prefetch("/clock")
  }, [router])

  const verifyPin = useCallback(async (enteredPin: string) => {
    setStatus("verifying")
    setErrorMessage("")

    try {
      const res = await fetch("/api/employee/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: enteredPin }),
      })
      const data = await res.json()

      if (res.ok) {
        try {
          sessionStorage.setItem("clock_employee", JSON.stringify(data.employee))
        } catch {}
        setStatus("success")
        router.replace("/clock")
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
  }, [router])

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

  const homeBg = "min-h-dvh bg-[rgb(33,42,53)]"

  if (status === "success") {
    return (
      <div className={cn("flex flex-col items-center justify-center px-6", homeBg)}>
        <p className="text-white animate-pulse text-sm">Opening...</p>
      </div>
    )
  }

  return (
    <div className={cn("relative flex flex-col items-center px-6 pb-8 pt-16", homeBg)}>
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
