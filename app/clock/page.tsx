"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import { useRouter } from "next/navigation"
import Webcam from "react-webcam"
import { LogOut, Loader2, ScanFace, UserX, ZoomIn } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { useFaceDetection } from "@/lib/hooks/UserFaceDetection"
import { logger } from "@/lib/utils/logger"
import dynamic from "next/dynamic"

// Dynamically import Confetti to avoid SSR issues
const Confetti = dynamic(() => import("react-confetti"), { ssr: false })

// ─── Types ────────────────────────────────────────────────────────────────────

type Employee = {
  id: string
  name: string
  pin: string
  role?: string
  detectedLocation?: string
}

type TimeEntry = {
  type: "in" | "break" | "endBreak" | "out"
  time: string
  label: string
}

type TodayPunches = {
  clockIn: string
  breakIn: string
  breakOut: string
  clockOut: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeDisplay(t?: string): string {
  if (!t || typeof t !== "string" || !t.trim()) return "—"
  const s = t.trim()
  const colonMatch = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10)
    const m = parseInt(colonMatch[2], 10)
    if (h === 0 && m === 0) return "—"
    const date = new Date(2000, 0, 1, h, m)
    return format(date, "h:mm a", { locale: enUS })
  }
  const d = new Date(s)
  if (isNaN(d.getTime())) return "—"
  return format(d, "h:mm a", { locale: enUS })
}

const HOME_BG = "min-h-dvh bg-dark"

// ─── Face status indicator ────────────────────────────────────────────────────

function FaceStatusBadge({ status }: { status: string }) {
  if (status === "loading") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-white/50">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading face detection…
      </div>
    )
  }
  if (status === "ready") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-brand">
        <ScanFace className="h-3 w-3" />
        Face detected — ready
      </div>
    )
  }
  if (status === "too_far") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-warning">
        <ZoomIn className="h-3 w-3" />
        Move closer to camera
      </div>
    )
  }
  if (status === "no_face") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-white/40">
        <UserX className="h-3 w-3" />
        No face detected
      </div>
    )
  }
  return null
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ClockPage() {
  const router = useRouter()
  const webcamRef = useRef<Webcam>(null)
  const idleLogoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [idleCountdown, setIdleCountdown] = useState<number | null>(null)

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [currentTime, setCurrentTime] = useState("")
  const [clockLoading, setClockLoading] = useState(false)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [todayPunches, setTodayPunches] = useState<TodayPunches | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [permissionsReady, setPermissionsReady] = useState(true)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"start" | "break" | "end">("start")
  const [isBirthday, setIsBirthday] = useState(false)

  // ── Face detection ─────────────────────────────────────────────────────────
  const { status: faceStatus, modelsLoaded, canvasRef, getLatestBlob, reset: resetFace } = useFaceDetection(
    webcamRef as React.RefObject<Webcam>,
    {
      minScore: 0.65,
      minFaceRatio: 0.18,
      stableFrameCount: 3,
      intervalMs: 150,
      captureQuality: 0.85,
      captureWidth: 640,
      captureHeight: 480,
    }
  )

  // ── Face detection is advisory — buttons are ALWAYS enabled ─────────────
  // Face detection only captures the photo — it never blocks punching.
  // noPhoto flag is sent to API when no face was detected.
  const faceDetected = faceStatus === "ready"
  const noPhoto = modelsLoaded && !faceDetected

  // ── Clock tick (every 60s — display is HH:MM only) ─────────────────────────
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }))
    }
    updateTime()
    const interval = setInterval(updateTime, 60_000)
    return () => clearInterval(interval)
  }, [])

  // ── Load employee from session or API ──────────────────────────────────────
  useEffect(() => {
    const cached = typeof window !== "undefined" ? sessionStorage.getItem("clock_employee") : null
    
    if (cached) {
      try {
        const data = JSON.parse(cached)
       
        const emp = data.employee ?? data
        const punches = data.punches ?? null
        const storedLocation = data.location ?? null
        
        // Redirect to PIN page if location is missing (e.g., after refresh)
        if (!storedLocation || !storedLocation.lat || !storedLocation.lng) {
          try { sessionStorage.removeItem("clock_employee") } catch {}
          router.replace("/")
          return
        }
        
        setEmployee({ 
          id: emp.id, 
          name: emp.name, 
          pin: emp.pin, 
          role: emp.role ?? "",
          detectedLocation: data.detectedLocation
        })
        setIsBirthday(data.isBirthday ?? false)
        
        if (punches && typeof punches === "object") {
          setTodayPunches({
            clockIn: punches.clockIn ?? "",
            breakIn: punches.breakIn ?? "",
            breakOut: punches.breakOut ?? "",
            clockOut: punches.clockOut ?? "",
          })
        }
        
        // Use stored location from login
        setLocation(storedLocation)
        setPermissionsReady(true)
        return
      } catch (err) {
        logger.error("[ClockPage] ❌ Error parsing session data:", err)
        try { sessionStorage.removeItem("clock_employee") } catch {}
        router.replace("/")
        return
      }
    }

    // No cached session - check if user has valid cookie
    fetch("/api/employee/me")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized")
        return res.json()
      })
      .then((data) => {
        // User has valid cookie but no session storage
        // This means they refreshed or lost session - redirect to PIN page for fresh location
        logger.warn("[ClockPage] ⚠️ Valid cookie but no session - redirecting to PIN page for location verification")
        router.replace("/")
      })
      .catch((err) => {
        // No valid cookie - redirect to PIN page
        logger.error("[ClockPage] ❌ API error:", err)
        try { sessionStorage.removeItem("clock_employee") } catch {}
        router.replace("/")
      })
  }, [router])

  // ── Derive active tab from punch state ─────────────────────────────────────
  useEffect(() => {
    const hasClockIn = !!(timeEntries.find((e) => e.type === "in")?.time || todayPunches?.clockIn)
    const hasBreakIn = !!(timeEntries.find((e) => e.type === "break")?.time || todayPunches?.breakIn)
    const hasBreakOut = !!(timeEntries.find((e) => e.type === "endBreak")?.time || todayPunches?.breakOut)
    const hasClockOut = !!(timeEntries.find((e) => e.type === "out")?.time || todayPunches?.clockOut)
    const isOnBreak = hasBreakIn && !hasBreakOut

    if (hasClockOut) setActiveTab("end")
    else if (isOnBreak) setActiveTab("break")
    else if (hasBreakIn && hasBreakOut) setActiveTab("end")
    else if (hasClockIn) setActiveTab("break")
    else setActiveTab("start")
  }, [todayPunches, timeEntries])

  // ── Permissions (iOS/Safari PWA) ───────────────────────────────────────────
  const handleEnableCameraAndLocation = useCallback(() => {
    setPermissionError(null)
    if (!navigator.geolocation || !navigator.mediaDevices?.getUserMedia) {
      setPermissionError("Camera or location is not supported on this device.")
      return
    }
    const geoPromise = new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err)
      )
    })
    const camPromise = navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      stream.getTracks().forEach((t) => t.stop())
    })
    Promise.all([geoPromise, camPromise])
      .then(([coords]) => { setLocation(coords); setPermissionsReady(true) })
      .catch((err) => {
        const msg =
          err?.code === 1 ? "Location was denied. Enable Location for this site in Settings."
          : err?.name === "NotAllowedError" ? "Camera was denied. Enable Camera for this site in Settings."
          : "Could not enable camera or location. Please check site permissions."
        setPermissionError(msg)
      })
  }, [])

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = useCallback(() => {
    if (idleLogoutTimeoutRef.current) {
      clearTimeout(idleLogoutTimeoutRef.current)
      idleLogoutTimeoutRef.current = null
    }
    setIdleCountdown(null)
    
    // Clear all session data
    try { 
      sessionStorage.removeItem("clock_employee")
    } catch (err) {
      logger.error("[ClockPage] Error clearing session:", err)
    }
    
    fetch("/api/employee/logout", { method: "POST" }).catch(() => {})
    router.replace("/")
  }, [router])

  // ── Idle logout — 30s with countdown warning ───────────────────────────────
  useEffect(() => {
    if (!employee) return
    const IDLE_SECONDS = 30
    let secondsLeft = IDLE_SECONDS
    setIdleCountdown(null)

    // Start countdown display at 10s remaining
    const countdownInterval = setInterval(() => {
      secondsLeft -= 1
      if (secondsLeft <= 10) setIdleCountdown(secondsLeft)
      if (secondsLeft <= 0) {
        clearInterval(countdownInterval)
        handleLogout()
      }
    }, 1000)

    return () => clearInterval(countdownInterval)
  }, [employee, handleLogout])

  // ── Clock action ───────────────────────────────────────────────────────────
  const handleClockAction = async (type: "in" | "break" | "endBreak" | "out") => {
    setClockLoading(true)
    setMessage(null)
    

    const now = new Date()
    const localDate = format(now, "dd-MM-yyyy", { locale: enUS })
    const localTime = format(now, "EEEE, MMMM d, yyyy h:mm:ss a", { locale: enUS })
    const latLng = location ? { lat: String(location.lat), lng: String(location.lng) } : null

    try {
      const blob = await getLatestBlob()
      resetFace()
      let imageUrl = ""

      if (blob) {
        const formData = new FormData()
        formData.append("file", blob, "clock.jpg")
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)
        try {
          const uploadRes = await fetch("/api/employee/upload/image", {
            method: "POST",
            body: formData,
            signal: controller.signal,
          })
          clearTimeout(timeout)
    
           if (uploadRes.ok) {
      const uploadData = await uploadRes.json()
      imageUrl = uploadData.url ?? ""
      
      if (!imageUrl) {
        logger.warn("[ClockPage] ⚠️ Upload succeeded but no URL returned")
      } else {
        logger.log("[ClockPage] ✅ Image uploaded:", imageUrl)
      }
    } else {
      const errorText = await uploadRes.text()
      logger.error("[ClockPage] ❌ Upload failed:", uploadRes.status, errorText)
    }
  } catch (err: unknown) {
    clearTimeout(timeout)
    logger.error("[ClockPage] ❌ Upload exception:", err)
    if (err instanceof Error && err.name === 'AbortError') {
      logger.error("[ClockPage] Upload timed out after 8s")
    }
  }
} else {
  logger.warn("[ClockPage] No blob available to upload")
}

      const res = await fetch("/api/employee/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          imageUrl,
          date: localDate,
          time: localTime,
          lat: latLng?.lat,
          lng: latLng?.lng,
          // Flag entry if punched without a detected face — manager can follow up
          noPhoto: noPhoto,   // true when face not detected
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed")

      const labels: Record<string, string> = {
        in: "Clocked In",
        break: "On Break",
        endBreak: "Break End",
        out: "Clocked Out",
      }
      setTimeEntries((prev) => [...prev, { type, time: localTime, label: labels[type] }])
      setMessage({ type: "success", text: `${labels[type]} at ${format(now, "h:mm:ss a", { locale: enUS })}` })

      // Log out immediately so next staff member can use kiosk
      handleLogout()
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed" })
    } finally {
      setClockLoading(false)
    }
  }

  // ── Derive punch state ─────────────────────────────────────────────────────
  const mergedPunches: TodayPunches = {
    clockIn:  timeEntries.find((e) => e.type === "in")?.time      || todayPunches?.clockIn  || "",
    breakIn:  timeEntries.find((e) => e.type === "break")?.time   || todayPunches?.breakIn  || "",
    breakOut: timeEntries.find((e) => e.type === "endBreak")?.time || todayPunches?.breakOut || "",
    clockOut: timeEntries.find((e) => e.type === "out")?.time     || todayPunches?.clockOut || "",
  }

  const hasClockIn  = !!mergedPunches.clockIn
  const hasBreakIn  = !!mergedPunches.breakIn
  const hasBreakOut = !!mergedPunches.breakOut
  const hasClockOut = !!mergedPunches.clockOut
  const isOnBreak   = hasBreakIn && !hasBreakOut

  const isClockInTabDisabled = hasClockIn || (hasBreakIn && !hasClockIn)
  const isBreakTabDisabled   = hasClockOut || (hasBreakIn && hasBreakOut)
  const isClockOutDisabled   = isOnBreak || hasClockOut

  const isArrowDimmed =
    clockLoading ||
    (activeTab === "start" && isClockInTabDisabled) ||
    (activeTab === "break" && isBreakTabDisabled) ||
    (activeTab === "end"   && isClockOutDisabled)

  // ── Loading state ──────────────────────────────────────────────────────────
  if (!employee) {
    return (
      <div className={cn("flex items-center justify-center", HOME_BG)}>
        <Loader2 className="h-10 w-10 animate-spin text-white/30" />
      </div>
    )
  }

  // ── Permissions gate (iOS/Safari) ──────────────────────────────────────────
  if (!permissionsReady) {
    return (
      <div className={cn("flex flex-col justify-center items-center gap-6 p-6", HOME_BG)}>
        <p className="text-white text-center text-lg max-w-sm">
          To clock in with photo and location, allow access when prompted.
        </p>
        <Button
          onClick={handleEnableCameraAndLocation}
          className="h-16 px-12 text-xl font-bold rounded-full bg-success hover:bg-success/90 text-white shadow-lg"
        >
          Enable Camera & Location
        </Button>
        {permissionError && (
          <p className="text-warning text-center text-sm max-w-sm">{permissionError}</p>
        )}
      </div>
    )
  }

  // ── Main UI ────────────────────────────────────────────────────────────────
  // Get first name for birthday message
  const firstName = employee?.name?.split(" ")[0] || "there"
  
  return (
    <div className={cn("min-h-dvh flex flex-col", HOME_BG)}>
      {/* Birthday Confetti - only renders on their birthday */}
      {isBirthday && (
        <Confetti
          numberOfPieces={200}
          recycle={false}
          gravity={0.3}
          tweenDuration={3000}
        />
      )}

      {/* Birthday Badge - only shows on their birthday */}
      {isBirthday && (
        <div className="absolute top-4 right-4 z-50 animate-bounce bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 text-white px-4 py-2 rounded-full shadow-lg">
          🎂 Happy Birthday {firstName}!
        </div>
      )}

      {/* Time Header */}
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <p className="text-3xl md:text-4xl font-bold tabular-nums tracking-tight text-center text-white w-full">
            {currentTime}
          </p>
        </div>
      </div>

     

      <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:p-4 md:p-0 xs:p-0 max-w-7xl mx-auto w-full">

        {/* ── Left — Video Feed ──────────────────────────────────────────────── */}
        <div className="lg:w-[40%] flex-shrink-0">
          <Card className="overflow-hidden relative group py-0 lg:w-[485px] xs:w-[420px] h-[500px] mx-auto">

            {/* Webcam */}
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.85}
              videoConstraints={{
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: "user",
                frameRate: { ideal: 30 },
              }}
              mirrored
              className="lg:w-[485px] xs:w-[420px] h-[500px] object-cover mx-auto"
              style={{ filter: "brightness(1.1) contrast(1.05) saturate(1.05)" }}
            />

            {/* Face detection overlay canvas — sits exactly on top of video */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ transform: "scaleX(-1)" }} // mirror to match webcam
            />

            {/* Info overlay */}
            <div className="absolute inset-0 flex flex-col justify-between p-6 lg:w-[485px] xs:w-[420px] h-[500px] mx-auto pointer-events-none">
              <div className="text-white [text-shadow:0_0_2px_rgba(0,0,0,0.9),0_1px_3px_rgba(0,0,0,0.9)]">
                <p className="font-bold text-lg">{employee.name}</p>
                <p className="text-sm text-white/80">{employee.role || "—"}</p>
                {employee.detectedLocation && (
                  <p className="text-xs text-white/70 mt-1">📍 {employee.detectedLocation}</p>
                )}
                {/* Face status */}
                <div className="mt-2 pointer-events-none">
                  <FaceStatusBadge status={faceStatus} />
                </div>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="w-fit bg-black/20 border-white/30 text-white hover:bg-black/40 hover:text-white pointer-events-auto"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </Card>

          {/* Punch times */}
          <div className="grid grid-cols-4 gap-2 mt-3 mx-auto lg:w-[485px] md:w-[420px] xs:w-[420px]">
            {[
              { label: "Clock In",  time: mergedPunches.clockIn,  cls: "bg-success/25 border-success text-success" },
              { label: "Break In",  time: mergedPunches.breakIn,  cls: "bg-warning/20 border-warning text-warning" },
              { label: "Break Out", time: mergedPunches.breakOut, cls: "bg-warning/20 border-warning text-warning" },
              { label: "Clock Out", time: mergedPunches.clockOut, cls: "bg-danger/20  border-danger  text-danger"  },
            ].map(({ label, time, cls }) => (
              <div key={label} className={cn("rounded-lg p-2 border text-center", cls)}>
                <p className="text-xs font-medium opacity-90">{label}</p>
                <p className="text-sm font-bold tabular-nums">{formatTimeDisplay(time)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right — Controls ───────────────────────────────────────────────── */}
        <div className="lg:w-[60%] flex flex-col">
          <Card className="lg:p-8 md:p-12 xs:p-0 bg-transparent border-none ring-0">
            <div className="flex-1 w-full">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as "start" | "break" | "end")}
                className="clock-tabs-wrapper w-full flex flex-col"
              >
                <TabsList
                  variant="line"
                  className="clock-tab-list flex w-full gap-1 mb-2"
                  indicatorClassName="clock-tab-indicator"
                >
                  <TabsTrigger value="start" disabled={isClockInTabDisabled} className="clock-tab-trigger text-2xl">
                    START
                  </TabsTrigger>
                  <TabsTrigger value="break" disabled={isBreakTabDisabled} className="clock-tab-trigger text-2xl">
                    BREAK
                  </TabsTrigger>
                  <TabsTrigger value="end" disabled={isClockOutDisabled} className="clock-tab-trigger text-2xl">
                    FINISH
                  </TabsTrigger>
                </TabsList>

                {/* Arrow indicator */}
                <div className="relative h-2 w-full mt-[-5px]">
                  <div
                    className="clock-tab-arrow absolute bottom-0 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[10px] transition-all duration-200 ease-out"
                    data-tab={activeTab}
                    style={{
                      left: activeTab === "start" ? "16.67%" : activeTab === "break" ? "50%" : "83.33%",
                      transform: "translate(-50%, 0)",
                      opacity: isArrowDimmed ? 0.5 : 1,
                    }}
                    aria-hidden
                  />
                </div>

               

                {/* START tab */}
                <TabsContent value="start" className="mt-[-8.5px]">
                  <Button
                    onClick={() => handleClockAction("in")}
                    disabled={clockLoading || isClockInTabDisabled}
                    className="clock-in-btn w-full h-16 text-2xl font-bold rounded-full text-white shadow-lg disabled:opacity-40 transition-opacity"
                  >
                    {clockLoading
                      ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> PROCESSING…</>
                      : faceDetected ? "CLOCK IN" : "CLOCK IN (no photo)"}
                  </Button>
                </TabsContent>

                {/* BREAK tab */}
                <TabsContent value="break" className="mt-[-8.5px]">
                  {isOnBreak ? (
                    <Button
                      onClick={() => handleClockAction("endBreak")}
                      disabled={clockLoading}
                      className="break-btn w-full h-16 text-2xl font-bold rounded-full text-white shadow-lg disabled:opacity-40"
                    >
                      {clockLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> PROCESSING…</> : "END BREAK"}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleClockAction("break")}
                      disabled={clockLoading}
                      className="break-btn w-full h-16 text-2xl font-bold rounded-full text-white shadow-lg disabled:opacity-40"
                    >
                      {clockLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> PROCESSING…</> : "START BREAK"}
                    </Button>
                  )}
                </TabsContent>

                {/* END tab */}
                <TabsContent value="end" className="mt-[-8.5px]">
                  <Button
                    onClick={() => handleClockAction("out")}
                    disabled={clockLoading || isClockOutDisabled}
                    className="clock-out-btn w-full h-16 text-2xl font-bold rounded-full text-white shadow-lg disabled:opacity-40"
                  >
                    {clockLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> PROCESSING…</> : "CLOCK OUT"}
                  </Button>
                </TabsContent>

                 {/* Idle countdown warning */}
      {idleCountdown !== null && (
        <div className="text-center pb-2">
          <p className="text-sm text-warning animate-pulse">
            Logging out in {idleCountdown}s…
          </p>
        </div>
      )}

                 {/* Message banner */}
                 {message && (
                  <div className={cn(
                    "mt-2 mb-3 rounded-lg px-4 py-2 text-sm font-medium text-center",
                    message.type === "success" ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                  )}>
                    {message.text}
                  </div>
                )}

                {/* Face status hint — informational only, never blocks */}
                {modelsLoaded && faceStatus !== "ready" && (
                  <p className="text-center text-xs mb-2 transition-colors duration-300">
                    {faceStatus === "too_far" ? (
                      <span className="text-warning">Move closer to the camera for a photo</span>
                    ) : (
                      <span className="text-white/40">No face detected — you can still Punch in </span>
                    )}
                  </p>
                )}
              </Tabs>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}