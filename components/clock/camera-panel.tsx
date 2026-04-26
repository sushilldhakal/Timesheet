"use client"

import { useRef, useCallback, useEffect } from "react"
import Webcam from "react-webcam"
import { Loader2, MapPin, ScanFace, UserX, ZoomIn } from "lucide-react"
import type { FaceStatus } from "@/lib/hooks/use-face-detection"

export type TodayPunches = {
  clockIn: string
  breakIn: string
  breakOut: string
  clockOut: string
}

type CameraPanelProps = {
  employee: {
    name: string
    role: string
    detectedLocation: string
    initials: string
  }
  faceStatus: FaceStatus
  punches: TodayPunches
  isOnline: boolean
  webcamRef: React.RefObject<Webcam>
  canvasRef: React.RefObject<HTMLCanvasElement>
}

const statusMap = {
  loading: {
    label: "Initialising face detection",
    icon: Loader2,
    color: "text-slate-300",
    ring: "ring-slate-600",
    pulse: false,
    spin: true,
  },
  ready: {
    label: "Face detected · ready",
    icon: ScanFace,
    color: "text-emerald-300",
    ring: "ring-emerald-400",
    pulse: true,
    spin: false,
  },
  too_far: {
    label: "Move closer to the camera",
    icon: ZoomIn,
    color: "text-amber-300",
    ring: "ring-amber-400",
    pulse: false,
    spin: false,
  },
  no_face: {
    label: "No face detected",
    icon: UserX,
    color: "text-slate-400",
    ring: "ring-slate-700",
    pulse: false,
    spin: false,
  },
  error: {
    label: "Camera error",
    icon: UserX,
    color: "text-rose-400",
    ring: "ring-rose-700",
    pulse: false,
    spin: false,
  },
} as const

export function CameraPanel({
  employee,
  faceStatus,
  punches,
  isOnline,
  webcamRef,
  canvasRef,
}: CameraPanelProps) {
  const status = statusMap[faceStatus]
  const StatusIcon = status.icon

  // iOS Safari / PWA video fixes
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
  }, [webcamRef])

  useEffect(() => {
    let rafId = 0
    const ensureVideoAttrs = () => {
      if (applyMobileVideoFixes()) return
      rafId = window.requestAnimationFrame(ensureVideoAttrs)
    }
    ensureVideoAttrs()
    return () => window.cancelAnimationFrame(rafId)
  }, [applyMobileVideoFixes])

  let badge: { text: string; className: string }
  if (punches.clockOut) {
    badge = { text: "Clocked Out", className: "bg-rose-500/90" }
  } else if (punches.breakIn && !punches.breakOut) {
    badge = { text: "On Break", className: "bg-amber-500/90" }
  } else if (punches.clockIn) {
    badge = { text: "On Shift", className: "bg-emerald-500/90" }
  } else {
    badge = { text: "Not Clocked In", className: "bg-slate-600/90" }
  }

  return (
    <div className="relative">
      <div
        className={[
          "relative aspect-[4/5] w-full overflow-hidden rounded-3xl bg-slate-900 ring-1 ring-inset transition-all duration-500",
          status.ring,
          status.pulse ? "shadow-[0_0_40px_-10px] shadow-emerald-500/50" : "",
        ].join(" ")}
      >
        {/* Live webcam feed */}
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
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: "brightness(1.1) contrast(1.05) saturate(1.05)" }}
        />

        {/* Face detection overlay canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full pointer-events-none"
          style={{ transform: "scaleX(-1)" }}
        />

        {/* Face-detection guide ellipse */}
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          viewBox="0 0 100 125"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <ellipse
            cx="50" cy="55" rx="26" ry="34"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.6"
            strokeDasharray="2 2"
            className={status.color}
            opacity={faceStatus === "ready" ? 0.9 : 0.5}
          />
        </svg>

        {/* Top overlay — face status + shift badge */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
          <div
            className={`flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium backdrop-blur-md ${status.color}`}
          >
            <StatusIcon className={`h-3.5 w-3.5 ${status.spin ? "animate-spin" : ""}`} />
            {status.label}
          </div>
          <div className={`rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-lg ${badge.className}`}>
            {badge.text}
          </div>
        </div>

        {/* Bottom overlay — employee identity card */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/50 p-3 backdrop-blur-md">
            <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 font-mono text-base font-semibold text-white">
              {employee.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{employee.name}</p>
              <p className="truncate text-xs text-slate-300">{employee.role}</p>
            </div>
            {employee.detectedLocation && (
              <div className="flex flex-none items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[11px] text-slate-200">
                <MapPin className="h-3 w-3" />
                <span className="max-w-[7rem] truncate">
                  {isOnline ? employee.detectedLocation : "Offline mode"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
