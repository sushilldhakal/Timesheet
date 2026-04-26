"use client"

import { DeviceGuard } from "@/components/device/device-guard"
import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import Webcam from "react-webcam"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/cn"
import { useFaceDetection, type FaceStatus } from "@/lib/hooks/use-face-detection"
import { logger } from "@/lib/utils/logger"
import { useEnhancedClock } from "@/lib/hooks/use-enhanced-clock"
import { getEmployeeProfile, employeeLogout } from "@/lib/api/employee-clock"
import dynamic from "next/dynamic"

import { TopBar } from "@/components/clock/top-bar"
import { CameraPanel } from "@/components/clock/camera-panel"
import { ActionPanel, type PunchType } from "@/components/clock/action-panel"
import { PunchSummary } from "@/components/clock/punch-summary"
import { DayTimeline } from "@/components/clock/day-timeline"

const Confetti = dynamic(() => import("react-confetti"), { ssr: false })

// ─── Types ────────────────────────────────────────────────────────────────────

type Employee = {
  id: string
  name: string
  pin: string
  role: string
  detectedLocation: string
}

type TodayPunches = {
  clockIn: string
  breakIn: string
  breakOut: string
  clockOut: string
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function ClockPage() {
  return (
    <DeviceGuard>
      <ClockPageContent />
    </DeviceGuard>
  )
}

// ─── Content ──────────────────────────────────────────────────────────────────

function ClockPageContent() {
  const router = useRouter()
  const webcamRef = useRef<Webcam>(null)

  const [now, setNow] = useState(() => new Date())
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [todayPunches, setTodayPunches] = useState<TodayPunches | null>(null)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [permissionsReady, setPermissionsReady] = useState(true)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [isBirthday, setIsBirthday] = useState(false)
  const [idleCountdown, setIdleCountdown] = useState<number | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [clockLoading, setClockLoading] = useState(false)
  const [clockSuccess, setClockSuccess] = useState(false)

  // Live clock — tick every minute, no seconds
  useEffect(() => {
    const tick = () => setNow(new Date())
    tick()
    // Align to the next minute boundary so it stays accurate
    const msToNextMinute = (60 - new Date().getSeconds()) * 1000
    const initial = setTimeout(() => {
      tick()
      const id = setInterval(tick, 60_000)
      return () => clearInterval(id)
    }, msToNextMinute)
    return () => clearTimeout(initial)
  }, [])

  // ── Face detection ─────────────────────────────────────────────────────────
  const {
    status: faceStatus,
    modelsLoaded,
    canvasRef,
    getLatestBlob,
    getLatestDescriptor,
    reset: resetFace,
  } = useFaceDetection(webcamRef as React.RefObject<Webcam>, {
    minScore: 0.65,
    minFaceRatio: 0.18,
    stableFrameCount: 3,
    intervalMs: 150,
    captureQuality: 0.85,
    captureWidth: 640,
    captureHeight: 480,
  })

  const faceDetected = faceStatus === "ready"
  const noPhoto = modelsLoaded && !faceDetected

  // ── Enhanced clock hook ────────────────────────────────────────────────────
  const {
    loading: enhancedLoading,
    success: enhancedSuccess,
    isOnline,
    handleClockAction: enhancedClockAction,
    syncPunches,
    pendingCount,
    hasOfflineData,
  } = useEnhancedClock({
    employeeId: employee?.id || "",
    location,
    getLatestBlob,
    getLatestDescriptor,
    resetFace,
    noPhoto,
    onSuccess: (type) => {
      const stamp = new Date().toISOString()
      setTodayPunches((prev) => {
        const base = prev ?? { clockIn: "", breakIn: "", breakOut: "", clockOut: "" }
        switch (type) {
          case "in":       return { ...base, clockIn: stamp }
          case "break":    return { ...base, breakIn: stamp }
          case "endBreak": return { ...base, breakOut: stamp }
          case "out":      return { ...base, clockOut: stamp }
        }
      })
      const labels: Record<string, string> = {
        in: "Clocked in successfully",
        break: "Break started",
        endBreak: "Welcome back",
        out: "Clocked out — see you next shift",
      }
      setMessage({ type: "success", text: labels[type] })
      setClockSuccess(true)
      setTimeout(() => handleLogout(), 2000)
    },
    onError: (error) => {
      setMessage({ type: "error", text: error })
      setClockSuccess(false)
    },
  })

  const actualLoading = clockLoading || enhancedLoading
  const actualSuccess = clockSuccess || enhancedSuccess

  // ── Load employee from session ─────────────────────────────────────────────
  useEffect(() => {
    const cached = typeof window !== "undefined" ? sessionStorage.getItem("clock_employee") : null
    if (cached) {
      try {
        const data = JSON.parse(cached)
        const emp = data.employee ?? data
        setEmployee({
          id: emp.id,
          name: emp.name,
          pin: emp.pin,
          role: emp.role ?? "",
          detectedLocation: data.detectedLocation || emp.location || "",
        })
        setIsBirthday(data.isBirthday ?? false)
        if (data.punches) {
          setTodayPunches({
            clockIn:  data.punches.clockIn  ?? "",
            breakIn:  data.punches.breakIn  ?? "",
            breakOut: data.punches.breakOut ?? "",
            clockOut: data.punches.clockOut ?? "",
          })
        }
        setLocation(data.location ?? null)
        setPermissionsReady(true)
        return
      } catch (err) {
        logger.error("[ClockPage] Error parsing session:", err)
        try { sessionStorage.removeItem("clock_employee") } catch {}
        router.replace("/pin")
        return
      }
    }
    getEmployeeProfile()
      .then((res) => {
        if (!res.data?.employee) throw new Error("Unauthorized")
        router.replace("/pin")
      })
      .catch(() => {
        try { sessionStorage.removeItem("clock_employee") } catch {}
        router.replace("/pin")
      })
  }, [router])

  // ── Permissions gate (iOS/Safari) ─────────────────────────────────────────
  const handleEnableCameraAndLocation = useCallback(() => {
    setPermissionError(null)
    if (!navigator.geolocation || !navigator.mediaDevices?.getUserMedia) {
      setPermissionError("Camera or location is not supported on this device.")
      return
    }
    Promise.all([
      new Promise<{ lat: number; lng: number }>((res, rej) =>
        navigator.geolocation.getCurrentPosition(
          (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
          rej
        )
      ),
      navigator.mediaDevices.getUserMedia({ video: true }).then((s) => s.getTracks().forEach((t) => t.stop())),
    ])
      .then(([coords]) => { setLocation(coords); setPermissionsReady(true) })
      .catch((err) => {
        setPermissionError(
          err?.code === 1 ? "Location was denied. Enable Location for this site in Settings."
          : err?.name === "NotAllowedError" ? "Camera was denied. Enable Camera for this site in Settings."
          : "Could not enable camera or location. Please check site permissions."
        )
      })
  }, [])

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = useCallback(() => {
    setIdleCountdown(null)
    try { sessionStorage.removeItem("clock_employee") } catch {}
    employeeLogout().catch(() => {})
    router.replace("/pin")
  }, [router])

  // ── Idle logout — 30s countdown ────────────────────────────────────────────
  useEffect(() => {
    if (!employee) return
    let secondsLeft = 30
    const id = setInterval(() => {
      secondsLeft -= 1
      setIdleCountdown(secondsLeft)
      if (secondsLeft <= 0) { clearInterval(id); handleLogout() }
    }, 1000)
    return () => clearInterval(id)
  }, [employee, handleLogout])

  // ── Clock action ───────────────────────────────────────────────────────────
  const handleClockAction = useCallback(async (type: PunchType) => {
    setClockLoading(true)
    setClockSuccess(false)
    setMessage(null)
    await enhancedClockAction(type)
    setClockLoading(false)
  }, [enhancedClockAction])

  // ── Derive next action ─────────────────────────────────────────────────────
  const punches: TodayPunches = todayPunches ?? { clockIn: "", breakIn: "", breakOut: "", clockOut: "" }

  const nextAction = useMemo<PunchType | null>(() => {
    const { clockIn, breakIn, breakOut, clockOut } = punches
    if (clockOut) return null
    if (!clockIn) return "in"
    if (breakIn && !breakOut) return "endBreak"
    if (!breakIn) return "break"
    return "out"
  }, [punches])

  // ── Loading state ──────────────────────────────────────────────────────────
  if (!employee) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-950">
        <Loader2 className="h-10 w-10 animate-spin text-slate-600" />
      </div>
    )
  }

  // ── Permissions gate ───────────────────────────────────────────────────────
  if (!permissionsReady) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-slate-950 p-6">
        <p className="max-w-sm text-center text-lg text-slate-200">
          To clock in with photo and location, allow access when prompted.
        </p>
        <Button
          onClick={handleEnableCameraAndLocation}
          className="h-16 rounded-full bg-emerald-500 px-12 text-xl font-bold text-white hover:bg-emerald-400"
        >
          Enable Camera &amp; Location
        </Button>
        {permissionError && <p className="max-w-sm text-center text-sm text-amber-400">{permissionError}</p>}
      </div>
    )
  }

  // ── Main UI ────────────────────────────────────────────────────────────────
  const firstName = employee.name.split(" ")[0] || "there"
  const initials = employee.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()

  return (
    <main className="relative min-h-dvh overflow-hidden bg-slate-950 text-slate-100">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(60rem 30rem at 15% -10%, rgba(16,185,129,0.12), transparent 60%), radial-gradient(50rem 25rem at 100% 110%, rgba(244,63,94,0.10), transparent 60%)",
        }}
      />

      {isBirthday && (
        <>
          <Confetti numberOfPieces={200} recycle={false} gravity={0.3} tweenDuration={3000} />
          <div className="absolute top-4 left-1/2 z-50 -translate-x-1/2 animate-bounce rounded-full bg-yellow-400/20 px-4 py-2 text-sm font-semibold text-yellow-300 shadow-lg">
            🎂 Happy Birthday {firstName}!
          </div>
        </>
      )}

      <div className={cn("relative z-10 mx-auto flex min-h-dvh w-full max-w-7xl flex-col gap-6 p-4 md:p-6 lg:p-8")}>
        <TopBar
          now={now}
          isOnline={isOnline}
          employeeName={employee.name}
          idleCountdown={idleCountdown}
          pendingCount={pendingCount}
          hasOfflineData={hasOfflineData}
          onLogout={handleLogout}
          onSyncNow={syncPunches}
        />

        <section className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <CameraPanel
            employee={{
              name: employee.name,
              role: employee.role || "—",
              detectedLocation: employee.detectedLocation || "",
              initials,
            }}
            faceStatus={faceStatus}
            punches={punches}
            isOnline={isOnline}
            webcamRef={webcamRef as React.RefObject<Webcam>}
            canvasRef={canvasRef as React.RefObject<HTMLCanvasElement>}
          />

          <div className="flex flex-col gap-6">
            <DayTimeline punches={punches} />
            <ActionPanel
              nextAction={nextAction}
              punches={punches}
              loading={actualLoading}
              success={actualSuccess}
              message={message}
              faceReady={faceDetected}
              onAction={handleClockAction}
            />
            <PunchSummary punches={punches} />
          </div>
        </section>
      </div>
    </main>
  )
}
