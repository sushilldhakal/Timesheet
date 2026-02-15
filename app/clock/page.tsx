"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import { useRouter } from "next/navigation"
import Webcam from "react-webcam"
import { LogOut, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type Employee = {
  id: string
  name: string
  pin: string
  role?: string
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

export default function ClockPage() {
  const router = useRouter()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [currentTime, setCurrentTime] = useState("")
  const [clockLoading, setClockLoading] = useState(false)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [todayPunches, setTodayPunches] = useState<TodayPunches | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const webcamRef = useRef<Webcam>(null)
  const [activeTab, setActiveTab] = useState<"start" | "break" | "end">("start")
  const idleLogoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const postPunchLogoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }))
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const cached = typeof window !== "undefined" ? sessionStorage.getItem("clock_employee") : null
    if (cached) {
      try {
        const data = JSON.parse(cached)
        setEmployee({ id: data.id, name: data.name, pin: data.pin, role: data.role })
      } catch {}
    }

    fetch("/api/employee/me")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized")
        return res.json()
      })
      .then((data) => {
        const firstOf = (v: string | string[] | undefined) =>
          Array.isArray(v) ? v[0] : typeof v === "string" ? v : undefined
        const role = firstOf(data.employee.location) || firstOf(data.employee.employer) || firstOf(data.employee.role)
        setEmployee({
          id: data.employee.id,
          name: data.employee.name,
          pin: data.employee.pin,
          role: role ?? "",
        })
        try {
          sessionStorage.setItem("clock_employee", JSON.stringify({
            id: data.employee.id,
            name: data.employee.name,
            pin: data.employee.pin,
            role: role ?? "",
          }))
        } catch {}
      })
      .catch(() => {
        try {
          sessionStorage.removeItem("clock_employee")
        } catch {}
        router.replace("/")
      })
  }, [router])

  const employeeId = employee?.id

  useEffect(() => {
    if (!employeeId) return
    fetch("/api/employee/timesheet")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.punches) setTodayPunches(data.punches)
      })
      .catch(() => {})
  }, [employeeId])

  // Set active tab from punch state: only one “next” action is valid.
  useEffect(() => {
    const hasClockIn = !!(
      timeEntries.filter((e) => e.type === "in").slice(-1)[0]?.time || todayPunches?.clockIn
    )
    const hasBreakIn = !!(
      timeEntries.filter((e) => e.type === "break").slice(-1)[0]?.time || todayPunches?.breakIn
    )
    const hasBreakOut = !!(
      timeEntries.filter((e) => e.type === "endBreak").slice(-1)[0]?.time || todayPunches?.breakOut
    )
    const hasClockOut = !!(
      timeEntries.filter((e) => e.type === "out").slice(-1)[0]?.time || todayPunches?.clockOut
    )
    const isOnBreak = hasBreakIn && !hasBreakOut

    let nextTab: "start" | "break" | "end" = "start"
    if (hasClockOut) {
      nextTab = "end"
    } else if (isOnBreak) {
      nextTab = "break"
    } else if (hasBreakIn && hasBreakOut) {
      nextTab = "end"
    } else if (hasClockIn && !hasBreakIn) {
      nextTab = "break"
    } else if (!hasClockIn && hasBreakIn) {
      nextTab = "start"
    } else {
      nextTab = "start"
    }
    setActiveTab(nextTab)
  }, [todayPunches, timeEntries])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    )
  }, [])

  /** Kiosk-optimized: very small image (240×180, 0.35) for fastest upload. */
  const captureImageAsBlob = useCallback((): Promise<Blob | null> =>
    new Promise((resolve) => {
      const webcam = webcamRef.current
      if (!webcam) {
        resolve(null)
        return
      }
      const canvas = webcam.getCanvas({ width: 240, height: 180 })
      if (!canvas) {
        resolve(null)
        return
      }
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.35)
    }), [])

  const handleClockAction = async (type: "in" | "break" | "endBreak" | "out") => {
    setClockLoading(true)
    setMessage(null)
    const now = new Date()
    const localDate = format(now, "dd-MM-yyyy", { locale: enUS })
    const localTime = format(now, "EEEE, MMMM d, yyyy h:mm:ss a", { locale: enUS })
    const latLng = location ? { lat: String(location.lat), lng: String(location.lng) } : null
    try {
      const blob = await captureImageAsBlob()
      let imageUrl = ""
      if (blob) {
        const formData = new FormData()
        formData.append("file", blob, "clock.jpg")
        const uploadController = new AbortController()
        const uploadTimeout = setTimeout(() => uploadController.abort(), 4000)
        try {
          const uploadRes = await fetch("/api/employee/upload/image", {
            method: "POST",
            body: formData,
            signal: uploadController.signal,
          })
          clearTimeout(uploadTimeout)
          if (uploadRes.ok) {
            const { url } = await uploadRes.json()
            imageUrl = url ?? ""
          }
        } catch {
          clearTimeout(uploadTimeout)
        }
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
      const timeDisplay = format(now, "h:mm:ss a", { locale: enUS })
      setTimeEntries((prev) => [...prev, { type, time: localTime, label: labels[type] }])
      setMessage({ type: "success", text: `${labels[type]} at ${timeDisplay}` })
      if (type === "in") setActiveTab("break")
      if (type === "endBreak" || type === "out") setActiveTab("end")
      if (idleLogoutTimeoutRef.current) {
        clearTimeout(idleLogoutTimeoutRef.current)
        idleLogoutTimeoutRef.current = null
      }
      // Log out immediately after any punch so next person can use the iPad (1s = brief success then out)
      postPunchLogoutTimeoutRef.current = setTimeout(() => {
        postPunchLogoutTimeoutRef.current = null
        handleLogout()
      }, 1000)
      fetch("/api/employee/timesheet")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d?.punches) setTodayPunches(d.punches) })
        .catch(() => {})
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed" })
    } finally {
      setClockLoading(false)
    }
  }

  const handleLogout = useCallback(async () => {
    if (idleLogoutTimeoutRef.current) {
      clearTimeout(idleLogoutTimeoutRef.current)
      idleLogoutTimeoutRef.current = null
    }
    if (postPunchLogoutTimeoutRef.current) {
      clearTimeout(postPunchLogoutTimeoutRef.current)
      postPunchLogoutTimeoutRef.current = null
    }
    try {
      sessionStorage.removeItem("clock_employee")
    } catch {}
    await fetch("/api/employee/logout", { method: "POST" })
    router.replace("/")
  }, [router])

  // 10s idle: if no punch, auto logout so next employee can use the kiosk
  useEffect(() => {
    if (!employee) return
    idleLogoutTimeoutRef.current = setTimeout(() => {
      idleLogoutTimeoutRef.current = null
      handleLogout()
    }, 10_000)
    return () => {
      if (idleLogoutTimeoutRef.current) {
        clearTimeout(idleLogoutTimeoutRef.current)
        idleLogoutTimeoutRef.current = null
      }
      if (postPunchLogoutTimeoutRef.current) {
        clearTimeout(postPunchLogoutTimeoutRef.current)
        postPunchLogoutTimeoutRef.current = null
      }
    }
  }, [employee, handleLogout])

  // Merge today's DB punches with session actions
  const mergedPunches: TodayPunches = {
    clockIn:
      timeEntries.filter((e) => e.type === "in").slice(-1)[0]?.time ||
      todayPunches?.clockIn ||
      "",
    breakIn:
      timeEntries.filter((e) => e.type === "break").slice(-1)[0]?.time ||
      todayPunches?.breakIn ||
      "",
    breakOut:
      timeEntries.filter((e) => e.type === "endBreak").slice(-1)[0]?.time ||
      todayPunches?.breakOut ||
      "",
    clockOut:
      timeEntries.filter((e) => e.type === "out").slice(-1)[0]?.time ||
      todayPunches?.clockOut ||
      "",
  }

  const hasClockIn = !!mergedPunches.clockIn
  const hasBreakIn = !!mergedPunches.breakIn
  const hasBreakOut = !!mergedPunches.breakOut
  const isOnBreak = hasBreakIn && !hasBreakOut

  const hasClockOut = !!mergedPunches.clockOut
  // Clock In tab: disabled if already clocked in, OR did break in without clock in (forgot to clock in)
  const isClockInTabDisabled = hasClockIn || (hasBreakIn && !hasClockIn)
  // Break tab: disabled when day complete OR break already done (both in and out)
  const isBreakTabDisabled = hasClockOut || (hasBreakIn && hasBreakOut)
  // Finish tab: disabled when on break (must end break first) OR already clocked out
  const isClockOutDisabled = isOnBreak || hasClockOut

  const homeBg = "min-h-dvh bg-[rgb(33,42,53)]"
  if (!employee) {
    return (
      <div className={cn("min-h-dvh flex items-center justify-center", homeBg)}>
        <Loader2 className="h-10 w-10 animate-spin text-slate-500" />
      </div>
    )
  }

  return (
    <div className={cn("min-h-dvh flex flex-col", homeBg)}>
      {/* Time Header */}
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-3xl md:text-4xl font-bold tabular-nums tracking-tight text-center">
            {currentTime}
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {/* Left - Video Feed */}
        <div className="lg:w-[40%] flex-shrink-0">
          <Card className="overflow-hidden relative group py-0 w-[485px] h-[500px] mx-auto">
            <Webcam
              ref={webcamRef}
              audio={false}
              width={485}
              height={500}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.55}
              videoConstraints={{ width: 485, height: 500, facingMode: "user" }}
              mirrored
              className="w-[485px] h-[500px] object-cover"
              style={{
                filter: "brightness(1.15) contrast(1.1) saturate(1.1) sepia(0.05)",
              }}
            />

            {/* Overlay Info */}
            <div className="absolute inset-0 flex flex-col justify-between p-6">
              <div className="text-white [text-shadow:0_0_2px_rgba(0,0,0,0.9),0_0_4px_rgba(0,0,0,0.8),0_1px_3px_rgba(0,0,0,0.9)]">
                <p className="font-bold text-lg">{employee.name}</p>
                <p className="text-sm text-white/90">{employee.role || "—"}</p>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="w-fit bg-black/20 border-white/30 text-white hover:bg-black/40 hover:text-white"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </Card>

          {/* 4-column punch times below webcam */}
          <div className="grid grid-cols-4 gap-2 mt-3 mx-auto w-[485px]">
            <div className="rounded-lg p-2 bg-emerald-500/20 border border-emerald-500/50 text-center">
              <p className="text-xs text-emerald-300 font-medium">Clock In</p>
              <p className="text-sm font-bold text-emerald-400 tabular-nums">{formatTimeDisplay(mergedPunches.clockIn)}</p>
            </div>
            <div className="rounded-lg p-2 bg-amber-500/20 border border-amber-500/50 text-center">
              <p className="text-xs text-amber-300 font-medium">Break In</p>
              <p className="text-sm font-bold text-amber-400 tabular-nums">{formatTimeDisplay(mergedPunches.breakIn)}</p>
            </div>
            <div className="rounded-lg p-2 bg-amber-500/20 border border-amber-500/50 text-center">
              <p className="text-xs text-amber-300 font-medium">Break Out</p>
              <p className="text-sm font-bold text-amber-400 tabular-nums">{formatTimeDisplay(mergedPunches.breakOut)}</p>
            </div>
            <div className="rounded-lg p-2 bg-red-500/20 border border-red-500/50 text-center">
              <p className="text-xs text-red-300 font-medium">Clock Out</p>
              <p className="text-sm font-bold text-red-400 tabular-nums">{formatTimeDisplay(mergedPunches.clockOut)}</p>
            </div>
          </div>
        </div>

        {/* Right - Controls */}
        <div className="lg:w-[60%] flex flex-col">
          <Card className="p-8 md:p-12 bg-transparent border-none ring-0">
          <div className="flex-1 w-full">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "start" | "break" | "end")} className="w-full flex flex-col ">
              {/* Tab Navigation */}
              <TabsList variant="line" className="clock-tab-list flex w-full gap-1 mb-2" indicatorClassName="clock-tab-indicator">
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

              <div className="relative h-2 w-full mt-[-5px]">
                <div className="absolute bottom-0 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[10px] transition-all duration-200 ease-out" style={{ left: activeTab === "start" ? "16.67%" : activeTab === "break" ? "50%" : "83.33%", transform: "translate(-50%, 0)", opacity: clockLoading || (activeTab === "start" && isClockInTabDisabled) || (activeTab === "break" && isBreakTabDisabled) || (activeTab === "end" && isClockOutDisabled) ? 0.5 : 1, borderBottomColor: activeTab === "start" ? "#4CAF50" : activeTab === "break" ? "rgb(245, 158, 11)" : "var(--clock-out-color)" }} aria-hidden ></div>
              </div>

              {/* START Tab */}
              <TabsContent value="start" className="mt-[-10px]">
                <Button
                  onClick={() => handleClockAction("in")}
                  disabled={clockLoading || isClockInTabDisabled}
                  className="w-full h-16 text-2xl font-bold rounded-full bg-[#4CAF50] hover:bg-[#45a049] text-white shadow-lg disabled:opacity-50"
                >
                  {clockLoading ? "PROCESSING..." : "CLOCK IN"}
                </Button>
              </TabsContent>

              {/* BREAK Tab – show only START BREAK or END BREAK based on current state */}
              <TabsContent value="break" className="mt-[-10px]">
                {isOnBreak ? (
                  <Button
                    onClick={() => handleClockAction("endBreak")}
                    disabled={clockLoading}
                    className="w-full h-16 text-2xl font-bold rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-lg disabled:opacity-50"
                  >
                    {clockLoading ? "PROCESSING..." : "END BREAK"}
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleClockAction("break")}
                    disabled={clockLoading}
                    className="w-full h-16 text-2xl font-bold rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-lg disabled:opacity-50"
                  >
                    {clockLoading ? "PROCESSING..." : "START BREAK"}
                  </Button>
                )}
              </TabsContent>

              {/* END Tab */}
              <TabsContent value="end" className="mt-[-10px]">
                <Button
                  onClick={() => handleClockAction("out")}
                  disabled={clockLoading || isClockOutDisabled}
                  className="clock-out-btn w-full h-16 text-2xl font-bold rounded-full text-white shadow-lg disabled:opacity-50"
                >
                  {clockLoading ? "PROCESSING..." : "CLOCK OUT"}
                </Button>
              </TabsContent>
            </Tabs>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
