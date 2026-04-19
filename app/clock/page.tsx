"use client"

import { DeviceGuard } from "@/components/device/device-guard"
import { useEffect, useState, useRef, useCallback } from "react"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import { useRouter } from "next/navigation"
import Webcam from "react-webcam"
import { LogOut, Loader2, ScanFace, UserX, ZoomIn, Check, Wifi, WifiOff, Upload, Clock, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { formatTime } from "@/lib/utils/format/time"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils/cn"
import { useFaceDetection } from "@/lib/hooks/use-face-detection"
import { logger } from "@/lib/utils/logger"
import { useEnhancedClock } from "@/lib/hooks/use-enhanced-clock"
import { OfflineStatus } from "@/components/clock/offline-status"
import { getEmployeeProfile, employeeLogout } from "@/lib/api/employee-clock"
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

function calculateBreakDuration(breakIn?: string, breakOut?: string): string {
  if (!breakIn || !breakOut) return "—"
  
  try {
    const breakInDate = new Date(breakIn)
    const breakOutDate = new Date(breakOut)
    
    if (isNaN(breakInDate.getTime()) || isNaN(breakOutDate.getTime())) return "—"
    
    const diffMs = breakOutDate.getTime() - breakInDate.getTime()
    if (diffMs <= 0) return "—"
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h`
    } else {
      return `${minutes}m`
    }
  } catch {
    return "—"
  }
}

// ─── Circular Progress Logout Button ─────────────────────────────────────────

function CircularLogoutButton({
  countdown,
  onLogout
}: {
  countdown: number | null;
  onLogout: () => void
}) {
  if (countdown === null) return null

  const progress = ((30 - countdown) / 30) * 100
  const circumference = 2 * Math.PI * 18 // radius = 18
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <button
      onClick={onLogout}
      className="relative w-12 h-12 rounded-full bg-red-500/10 hover:bg-red-500/20 transition-colors duration-200 group"
      title={`Logging out in ${countdown}s - Click to logout now`}
    >
      {/* Circular progress ring */}
      <svg
        className="absolute inset-0 w-full h-full -rotate-90"
        viewBox="0 0 40 40"
      >
        {/* Progress circle */}
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          stroke="rgb(239, 68, 68)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>

      {/* X icon */}
      <X className="absolute inset-0 m-auto h-5 w-5 text-red-400 group-hover:text-red-300 transition-colors" />
    </button>
  )
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
  return (
    <DeviceGuard>
      <ClockPageContent />
    </DeviceGuard>
  )
}

function ClockPageContent() {
  const router = useRouter()
  const webcamRef = useRef<Webcam>(null)
  const idleLogoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [idleCountdown, setIdleCountdown] = useState<number | null>(null)

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [currentTime, setCurrentTime] = useState("")
  const [clockLoading, setClockLoading] = useState(false)
  const [clockSuccess, setClockSuccess] = useState(false)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [todayPunches, setTodayPunches] = useState<TodayPunches | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [permissionsReady, setPermissionsReady] = useState(true)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"start" | "break" | "end">("start")
  const [isBirthday, setIsBirthday] = useState(false)

  // ── Face detection ─────────────────────────────────────────────────────────
  const {
    status: faceStatus,
    modelsLoaded,
    canvasRef,
    getLatestBlob,
    getLatestDescriptor,
    reset: resetFace,
  } = useFaceDetection(
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

  // ── iOS Safari / PWA video playback quirks ──────────────────────────────────
  const applyMobileVideoFixes = useCallback(() => {
    const video = webcamRef.current?.video as HTMLVideoElement | undefined
    if (!video) return false
    video.setAttribute("playsinline", "true")
    video.setAttribute("webkit-playsinline", "true")
    video.setAttribute("autoplay", "true")
    video.setAttribute("muted", "true")
    video.playsInline = true
    video.autoplay = true
    video.muted = true
    return true
  }, [])

  useEffect(() => {
    let rafId = 0
    const ensureVideoAttrs = () => {
      if (applyMobileVideoFixes()) return
      rafId = window.requestAnimationFrame(ensureVideoAttrs)
    }
    ensureVideoAttrs()
    return () => window.cancelAnimationFrame(rafId)
  }, [applyMobileVideoFixes, webcamRef])

  // ── Face detection is advisory — buttons are ALWAYS enabled ─────────────
  // Face detection only captures the photo — it never blocks punching.
  // noPhoto flag is sent to API when no face was detected.
  const faceDetected = faceStatus === "ready"
  const noPhoto = modelsLoaded && !faceDetected

  // ── Enhanced Clock Hook ────────────────────────────────────────────────────
  const {
    loading: enhancedLoading,
    success: enhancedSuccess,
    isOnline,
    syncQueue,
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
    onSuccess: (type, message) => {
      const now = new Date()
      const labels: Record<string, string> = {
        in: "Clocked In",
        break: "On Break",
        endBreak: "Break End",
        out: "Clocked Out",
      }
      
      setTimeEntries((prev) => [...prev, { 
        type, 
        time: format(now, "EEEE, MMMM d, yyyy h:mm:ss a", { locale: enUS }), 
        label: labels[type] 
      }])
      setMessage({ type: "success", text: message })
      setClockSuccess(true)
      
      // Wait 2 seconds to show success animation, then log out
      setTimeout(() => {
        handleLogout()
      }, 2000)
    },
    onError: (error) => {
      setMessage({ type: "error", text: error })
      setClockSuccess(false)
    },
  })

  // Use enhanced loading state
  const actualClockLoading = clockLoading || enhancedLoading
  const actualClockSuccess = clockSuccess || enhancedSuccess

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
    logger.log("[ClockPage] Loading employee from session or API")
    const cached = typeof window !== "undefined" ? sessionStorage.getItem("clock_employee") : null
    
    if (cached) {
      logger.log("[ClockPage] Found cached session data")
      try {
        const data = JSON.parse(cached)
        logger.log("[ClockPage] Parsed session data:", { 
          hasEmployee: !!data.employee, 
          employeeName: data.employee?.name,
          hasLocation: !!data.location,
          location: data.location,
          offline: data.offline 
        })
       
        const emp = data.employee ?? data
        const punches = data.punches ?? null
        const storedLocation = data.location ?? null
        
        // Redirect to PIN page if location is missing (e.g., after refresh)
        // Allow offline mode with fallback location
        if (!storedLocation || (!storedLocation.lat && !storedLocation.lng && !data.offline)) {
          logger.error("[ClockPage] ❌ Location validation failed:", { storedLocation, offline: data.offline })
          try { sessionStorage.removeItem("clock_employee") } catch {}
          router.replace("/pin")
          return
        }
        
        logger.log("[ClockPage] ✅ Location validation passed, setting employee data")
        
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
        logger.log("[ClockPage] ✅ Employee data set successfully")
        return
      } catch (err) {
        logger.error("[ClockPage] ❌ Error parsing session data:", err)
        try { sessionStorage.removeItem("clock_employee") } catch {}
        router.replace("/pin")
        return
      }
    }

    // No cached session - check if user has valid cookie
    logger.log("[ClockPage] No cached session, checking employee cookie")
    getEmployeeProfile()
      .then(async (res) => {
        logger.log("[ClockPage] Employee API response:", { status: res.data?.employee ? "ok" : "error" })
        if (!res.data?.employee) throw new Error("Unauthorized")
        // User has valid cookie but no session storage
        // This means they refreshed or lost session - redirect to PIN page for fresh location
        logger.warn("[ClockPage] ⚠️ Valid cookie but no session - redirecting to PIN page for location verification")
        router.replace("/pin")
      })
      .catch((err) => {
        // No valid cookie - redirect to PIN page
        logger.error("[ClockPage] ❌ API error:", err)
        try { sessionStorage.removeItem("clock_employee") } catch {}
        router.replace("/pin")
      })
  }, [router])

  // ── Derive initial active tab from punch state (on mount and when punches load) ─
  useEffect(() => {
    if (!todayPunches) return // Wait for punches to load
    
    const hasClockIn = !!todayPunches.clockIn
    const hasBreakIn = !!todayPunches.breakIn
    const hasBreakOut = !!todayPunches.breakOut
    const hasClockOut = !!todayPunches.clockOut
    const isOnBreak = hasBreakIn && !hasBreakOut

    if (hasClockOut) setActiveTab("end")
    else if (isOnBreak) setActiveTab("break")
    else if (hasBreakIn && hasBreakOut) setActiveTab("end")
    else if (hasClockIn) setActiveTab("break")
    else setActiveTab("start")
  }, [todayPunches]) // Run when todayPunches loads from session

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
    
    employeeLogout().catch(() => {})
    router.replace("/pin")
  }, [router])

  // ── Idle logout — 30s with countdown warning ───────────────────────────────
  useEffect(() => {
    if (!employee) return
    const IDLE_SECONDS = 30
    let secondsLeft = IDLE_SECONDS

    // Start countdown display immediately when timer starts
    const countdownInterval = setInterval(() => {
      secondsLeft -= 1
      setIdleCountdown(secondsLeft)
      if (secondsLeft <= 0) {
        clearInterval(countdownInterval)
        handleLogout()
      }
    }, 1000)

    return () => clearInterval(countdownInterval)
  }, [employee, handleLogout])
  console.log("no thing clicked ")
console.log("clockLoading",clockLoading)
  // ── Clock action ───────────────────────────────────────────────────────────
  const handleClockAction = async (type: "in" | "break" | "endBreak" | "out") => {
    setClockLoading(true)
    setClockSuccess(false)
    setMessage(null)
    
    // Use the enhanced clock action
    await enhancedClockAction(type)
    
    setClockLoading(false)
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
        <div className="absolute top-4 right-4 z-50 animate-bounce px-4 py-2 rounded-full shadow-lg">
          🎂 Happy Birthday {firstName}!
        </div>
      )}

      {/* Time Header */}
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <p className="text-3xl md:text-4xl font-bold tabular-nums tracking-tight text-center text-white w-full">
            {currentTime}
          </p>
          
          {/* Circular Logout Button - shows when countdown is active */}
          {idleCountdown !== null && (
            <div className="absolute top-4 right-4 z-50">
              <CircularLogoutButton 
                countdown={idleCountdown} 
                onLogout={handleLogout} 
              />
            </div>
          )}
          
          {/* Offline/Online Status & Sync Queue - only show when offline or has pending data and no logout countdown */}
          {(!isOnline || hasOfflineData) && idleCountdown === null && (
            <OfflineStatus
              isOnline={isOnline}
              pendingCount={pendingCount}
              hasOfflineData={hasOfflineData}
              onSyncNow={syncPunches}
              className="absolute top-4 right-4"
            />
          )}
        </div>
      </div>

     

      <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:p-4 md:p-0 xs:p-0 max-w-7xl mx-auto w-full">

        {/* ── Left — Video Feed ──────────────────────────────────────────────── */}
        <div className="lg:w-[40%] flex-shrink-0">
          <Card className="overflow-hidden relative group py-0 lg:w-[485px] xs:w-[420px] h-[500px] mx-auto bg-dark">

            {/* Webcam */}
            <Webcam
              ref={webcamRef}
              audio={false}
              autoPlay
              muted
              playsInline
              screenshotFormat="image/jpeg"
              screenshotQuality={0.85}
              onUserMedia={applyMobileVideoFixes}
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
              <div className="flex items-start justify-between gap-2">
                <div className="text-white [text-shadow:0_0_2px_rgba(0,0,0,0.9),0_1px_3px_rgba(0,0,0,0.9)]">
                  <p className="font-bold text-lg [text-shadow:0_0_2px_rgba(0,0,0,0.9),0_1px_3px_rgba(0,0,0,0.9)]">{employee.name}</p>
                  <p className="text-sm font-bold text-white/80 [text-shadow:0_0_2px_rgba(0,0,0,0.9),0_1px_3px_rgba(0,0,0,0.9)]">{employee.role || "—"}</p>
                  {/* Display location based on current online/offline status */}
                  {(() => {
                    // If currently offline, show "Offline Mode"
                    if (!isOnline) {
                      return (
                        <p className="text-xs font-bold text-white/70 mt-1 [text-shadow:0_0_2px_rgba(0,0,0,0.9),0_1px_3px_rgba(0,0,0,0.9)]">📍 Offline Mode</p>
                      )
                    }
                    
                    // If online, show the detected location (but not if it's "Offline Mode")
                    if (employee.detectedLocation && employee.detectedLocation !== "Offline Mode") {
                      return (
                        <p className="text-xs font-bold text-white/70 mt-1 [text-shadow:0_0_2px_rgba(0,0,0,0.9),0_1px_3px_rgba(0,0,0,0.9)]">📍 {employee.detectedLocation}</p>
                      )
                    }
                    
                    // If online but no valid location, don't show anything
                    return null
                  })()}
                  {/* Face status */}
                  <div className="mt-2 pointer-events-none">
                    <FaceStatusBadge status={faceStatus} />
                  </div>
                </div>
                
                {/* Last clock status badge */}
                {(() => {
                  let statusText = ""
                  let statusColor = ""
                  
                  if (hasClockOut) {
                    statusText = "Clocked Out"
                    statusColor = "bg-danger/90"
                  } else if (isOnBreak) {
                    statusText = "On Break"
                    statusColor = "bg-warning/90"
                  } else if (hasBreakOut) {
                    statusText = "Break Ended"
                    statusColor = "bg-warning/90"
                  } else if (hasClockIn) {
                    statusText = "Clocked In"
                    statusColor = "bg-success/90"
                  } else {
                    // No punches at all - show clocked out
                    statusText = "Clocked Out"
                    statusColor = "bg-gray-500/90"
                  }
                  
                  return (
                    <div className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-lg [text-shadow:0_0_2px_rgba(0,0,0,0.9),0_1px_3px_rgba(0,0,0,0.9)]",
                      statusColor
                    )}>
                      {statusText}
                    </div>
                  )
                })()}
              </div>
              
              {/* Time display overlay - replaces logout button */}
              <div className="grid grid-cols-3 gap-10 pointer-events-none">
  {/* Clock In */}
  {hasClockIn && 
  <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
    <p className="text-sm font-medium text-white/60 mb-0.5">IN</p>
    <p className="text-sm font-bold text-white tabular-nums">
      {formatTime(mergedPunches.clockIn)}
    </p>
  </div>
}

  {/* Clock Out */}
  {hasClockOut && 
  <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
    <p className="text-sm font-medium text-white/60 mb-0.5">OUT</p>
    <p className="text-sm font-bold text-white tabular-nums">
      {formatTime(mergedPunches.clockOut)}
    </p>
  </div>
}

  {/* Break Duration */}
  {hasBreakOut && 
  <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
    <p className="text-sm font-medium text-white/60 mb-0.5">BREAK</p>
    <p className="text-sm font-bold text-white tabular-nums">
      {hasBreakOut && mergedPunches.breakIn && mergedPunches.breakOut 
        ? calculateBreakDuration(mergedPunches.breakIn, mergedPunches.breakOut)
        : hasBreakIn
          ? formatTime(mergedPunches.breakIn)
          : "—"
      }
    </p>
  </div>
}



</div>
            </div>
          </Card>
         
        </div>

        {/* ── Right — Controls ───────────────────────────────────────────────── */}
        <div className="lg:w-[60%] flex flex-col">
          <Card className="lg:p-8 md:p-12 xs:p-5 bg-transparent border-none ring-0 !mt-24 sm:!mt-0">
            <div className="flex-1 w-full">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as "start" | "break" | "end")}
                className=" w-full flex flex-col"
              >
                <TabsList
                  variant="line"
                  className="clock-tab-list flex w-full gap-1 mb-2 relative"
                  indicatorClassName="!bg-brand rounded-[24px] z-1"
                >
                  <TabsTrigger value="start" disabled={isClockInTabDisabled} className="text-brand data-[state=active]:text-white data-[state=active]:!z-2 !bg-dark data-[state=active]:!bg-transparent  rounded-[24px] cursor-pointer hover:text-brand text-2xl disabled:opacity-100">
                    <span className="relative z-2">START</span>
                  </TabsTrigger>
                  <TabsTrigger value="break" disabled={isBreakTabDisabled} className="text-brand data-[state=active]:text-white data-[state=active]:!z-2 !bg-dark data-[state=active]:!bg-transparent  rounded-[24px] cursor-pointer hover:text-brand text-2xl disabled:opacity-100">
                    <span className="relative z-2">BREAK</span>
                  </TabsTrigger>
                  <TabsTrigger value="end" disabled={isClockOutDisabled} className="text-brand data-[state=active]:text-white data-[state=active]:!z-2 !bg-dark data-[state=active]:!bg-transparent  rounded-[24px] cursor-pointer hover:text-brand text-2xl disabled:opacity-100">
                    <span className="relative z-2">FINISH</span>
                  </TabsTrigger>
                  
                  {/* Animated pointer triangle */}
                  <div 
                    className={cn(
                      "absolute bottom-[-25px] mt-1 w-0 h-0 transition-all duration-300 ease-in-out",
                      "border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[10px]",
                      activeTab === "start" && "left-[16.666%] border-b-success",
                      (activeTab === "start" && isClockInTabDisabled) && "opacity-50",
                      activeTab === "break" && "left-[50%] border-b-warning",
                      (activeTab === "break" && isBreakTabDisabled) && "opacity-50",
                      activeTab === "end" && "left-[83.333%] border-b-danger",
                      (actualClockLoading || actualClockSuccess) && "opacity-0 invisible",
                      (activeTab === "end" && isClockOutDisabled) && "opacity-50",
                    )}
                    style={{ transform: "translateX(-50%)" }}
                  />
                </TabsList>

                {/* START tab */}
                <TabsContent value="start" className="mt-2">
                  <Button
                    onClick={() => handleClockAction("in")}
                    disabled={actualClockLoading || actualClockSuccess || isClockInTabDisabled}
                    className={cn(
                      "clock-in-btn justify-center flex font-bold rounded-full text-white shadow-lg transition-all duration-300",
                      actualClockLoading || actualClockSuccess 
                        ? "w-16 h-16 mx-auto" 
                        : "w-full h-16 text-2xl"
                    )}
                  >
                    {actualClockLoading && <Loader2 className="h-6 w-6 animate-spin" />}
                    {actualClockSuccess && <Check className="h-6 w-6" />}
                    {!actualClockLoading && !actualClockSuccess && "CLOCK IN"}
                  </Button>
                </TabsContent>

                {/* BREAK tab */}
                <TabsContent value="break" className="mt-2">
                  {isOnBreak ? (
                    <Button
                      onClick={() => handleClockAction("endBreak")}
                      disabled={actualClockLoading || actualClockSuccess}
                      className={cn(
                        "break-btn justify-center flex font-bold rounded-full text-white shadow-lg transition-all duration-300",
                        actualClockLoading || actualClockSuccess 
                          ? "w-16 h-16 mx-auto" 
                          : "w-full h-16 text-2xl"
                      )}
                    >
                      {actualClockLoading && <Loader2 className="h-6 w-6 animate-spin" />}
                      {actualClockSuccess && <Check className="h-6 w-6" />}
                      {!actualClockLoading && !actualClockSuccess && "END BREAK"}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleClockAction("break")}
                      disabled={actualClockLoading || actualClockSuccess}
                      className={cn(
                        "break-btn justify-center flex font-bold rounded-full text-white shadow-lg transition-all duration-300",
                        actualClockLoading || actualClockSuccess 
                          ? "w-16 h-16 mx-auto" 
                          : "w-full h-16 text-2xl"
                      )}
                    >
                      {actualClockLoading && <Loader2 className="h-6 w-6 animate-spin" />}
                      {actualClockSuccess && <Check className="h-6 w-6" />}
                      {!actualClockLoading && !actualClockSuccess && "START BREAK"}
                    </Button>
                  )}
                </TabsContent>

                {/* END tab */}
                <TabsContent value="end" className="mt-2">
                  <Button
                    onClick={() => handleClockAction("out")}
                    disabled={actualClockLoading || actualClockSuccess || isClockOutDisabled}
                    className={cn(
                      "clock-out-btn justify-center flex font-bold rounded-full text-white shadow-lg transition-all duration-300",
                      actualClockLoading || actualClockSuccess 
                        ? "w-16 h-16 mx-auto" 
                        : "w-full h-16 text-2xl"
                    )}
                  >
                    {actualClockLoading && <Loader2 className="h-6 w-6 animate-spin" />}
                    {actualClockSuccess && <Check className="h-6 w-6" />}
                    {!actualClockLoading && !actualClockSuccess && "CLOCK OUT"}
                  </Button>
                </TabsContent>

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
                      <span className="text-white/40"> </span>
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