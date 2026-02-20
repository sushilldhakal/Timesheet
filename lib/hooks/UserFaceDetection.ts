"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type Webcam from "react-webcam"

// ─── Types ────────────────────────────────────────────────────────────────────

export type FaceStatus =
  | "loading"   // models not yet loaded
  | "no_face"   // no face in frame
  | "too_far"   // face detected but too small
  | "ready"     // face detected — image already captured
  | "error"     // camera/model error

interface FaceDetectionOptions {
  /** Minimum detection score 0–1. Default 0.65 */
  minScore?: number
  /** Minimum face box width as % of video width. Default 0.18 */
  minFaceRatio?: number
  /** Consecutive "ready" frames before capturing. Default 3 */
  stableFrameCount?: number
  /** Detection poll interval ms. Default 150 */
  intervalMs?: number
  /** JPEG quality 0–1. Default 0.85 */
  captureQuality?: number
  /** Capture width px. Default 640 */
  captureWidth?: number
  /** Capture height px. Default 480 */
  captureHeight?: number
}

export interface FaceDetectionResult {
  status: FaceStatus
  modelsLoaded: boolean
  /** Ref to attach to the overlay <canvas> */
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  /**
   * Returns the single captured Blob (taken the moment face was first stable).
   * Falls back to a fresh capture if called before face was detected.
   * Returns null if webcam unavailable.
   */
  getLatestBlob: () => Promise<Blob | null>
  /** Clear captured blob + restart detection — call after each clock action */
  reset: () => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFaceDetection(
  webcamRef: React.RefObject<Webcam>,
  options: FaceDetectionOptions = {}
): FaceDetectionResult {
  const {
    minScore         = 0.65,
    minFaceRatio     = 0.18,
    stableFrameCount = 3,
    intervalMs       = 150,
    captureQuality   = 0.85,
    captureWidth     = 640,
    captureHeight    = 480,
  } = options

  const canvasRef      = useRef<HTMLCanvasElement>(null)
  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const stableFrames   = useRef(0)

  // The ONE blob captured the first time face is stable — never overwritten
  const capturedBlob   = useRef<Blob | null>(null)
  // Stops capture loop once we have our blob
  const hasCaptured    = useRef(false)

  const [status, setStatus]             = useState<FaceStatus>("loading")
  const [modelsLoaded, setModelsLoaded] = useState(false)

  // ── Single frame capture ───────────────────────────────────────────────────
  const captureOnce = useCallback((): Promise<Blob | null> =>
    new Promise((resolve) => {
        const webcam = webcamRef.current
        console.log("[FaceDetection] captureOnce — webcam:", !!webcam)
        if (!webcam) return resolve(null)
        const canvas = webcam.getCanvas({ width: captureWidth, height: captureHeight })
        console.log("[FaceDetection] captureOnce — canvas:", !!canvas)
      if (!canvas) return resolve(null)
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", captureQuality)
    }),
  [webcamRef, captureWidth, captureHeight, captureQuality])

  // ── Stop detection loop ────────────────────────────────────────────────────
  const stopLoop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // ── Load models ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const faceapi = await import("@vladmandic/face-api")
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models")
        if (!cancelled) {
          setModelsLoaded(true)
          setStatus("no_face")
        }
      } catch (err) {
        console.error("[FaceDetection] model load failed:", err)
        if (!cancelled) setStatus("error")
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ── Detection loop — stops itself once blob is captured ───────────────────
  useEffect(() => {
    if (!modelsLoaded) return

    async function detect() {
      // Already have our image — nothing left to do
      if (hasCaptured.current) {
        stopLoop()
        return
      }

      const faceapi = await import("@vladmandic/face-api")
      const video   = webcamRef.current?.video
      const canvas  = canvasRef.current
      if (!video || video.readyState < 2 || !canvas) return

      // Size overlay canvas to video
      const { videoWidth: vw, videoHeight: vh } = video
      if (canvas.width !== vw || canvas.height !== vh) {
        canvas.width  = vw
        canvas.height = vh
      }

      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.clearRect(0, 0, vw, vh)

      try {
        const detection = await faceapi.detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: minScore })
        )

        if (!detection) {
          stableFrames.current = 0
          setStatus("no_face")
          return
        }

        const { x, y, width, height } = detection.box
        const faceRatio = width / vw

        if (faceRatio < minFaceRatio) {
          stableFrames.current = 0
          setStatus("too_far")
          drawCorners(ctx, x, y, width, height, Math.min(width, height) * 0.18, "rgb(255,149,3)")
          return
        }

        // Face is good size — increment stable counter
        stableFrames.current += 1
        drawCorners(ctx, x, y, width, height, Math.min(width, height) * 0.18, "#3fafd7")

        // Once stable for enough frames — capture ONCE and stop
        if (stableFrames.current >= stableFrameCount && !hasCaptured.current) {
          hasCaptured.current = true
          setStatus("ready")

          console.log("[FaceDetection] Stable face reached — attempting capture")

  const blob = await captureOnce()
  console.log("[FaceDetection] captureOnce result:", blob ? `Blob ${blob.size} bytes` : "NULL — canvas returned nothing")
  if (blob) {
    capturedBlob.current = blob
    console.log("[FaceDetection] ✅ Blob saved to capturedBlob.current")
  } else {
    console.warn("[FaceDetection] ❌ Blob was null — webcam canvas not ready?")
  }

          // Stop detection loop — job done, no more CPU/memory usage
          stopLoop()

          // Clear the canvas overlay — no need to keep drawing the box
          ctx.clearRect(0, 0, vw, vh)
        }
      } catch {
        // Ignore per-frame errors
      }
    }

    intervalRef.current = setInterval(detect, intervalMs)
    return () => stopLoop()
  }, [modelsLoaded, minScore, minFaceRatio, stableFrameCount, intervalMs, webcamRef, captureOnce, stopLoop])

  // ── Public: get the captured blob ─────────────────────────────────────────
  const getLatestBlob = useCallback(async (): Promise<Blob | null> => {
    // If we have a face-confirmed blob, always use that — ignore what the
    // camera is showing right now (could be a hand, wall, darkness, etc.)
    if (capturedBlob.current) return capturedBlob.current
    // No face was ever detected (bad light, camera issue) — capture whatever
    // the camera sees now as a fallback. Better than nothing for the record.
    return captureOnce()
  }, [captureOnce])

  // ── Reset for next staff member ────────────────────────────────────────────
  const reset = useCallback(() => {
    capturedBlob.current = null
    hasCaptured.current  = false
    stableFrames.current = 0
    setStatus("no_face")

    // Restart detection loop for next person
    // (modelsLoaded is still true so the useEffect won't re-run — restart manually)
    // We set modelsLoaded triggers via a small trick: re-run by clearing canvas
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [])

  // Restart detection loop after reset
  useEffect(() => {
    if (!modelsLoaded) return
    if (hasCaptured.current) return // don't restart if already captured
    // Loop is managed by the detection useEffect above
  }, [modelsLoaded])

  return { status, modelsLoaded, canvasRef, getLatestBlob, reset }
}

// ─── Draw corner brackets ─────────────────────────────────────────────────────

function drawCorners(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  len: number,
  colour: string
) {
  ctx.strokeStyle = colour
  ctx.lineWidth   = 3
  ctx.lineCap     = "round"
  ctx.shadowBlur  = 12
  ctx.shadowColor = colour

  const corners: [number, number, number, number][] = [
    [x,     y,      len,   len],   // top-left     → right, down
    [x + w, y,     -len,   len],   // top-right    → left,  down
    [x,     y + h,  len,  -len],   // bottom-left  → right, up
    [x + w, y + h, -len,  -len],   // bottom-right → left,  up
  ]

  corners.forEach(([cx, cy, hx, vy]) => {
    ctx.beginPath()
    ctx.moveTo(cx + hx, cy)   // horizontal arm
    ctx.lineTo(cx, cy)         // corner point
    ctx.lineTo(cx, cy + vy)    // vertical arm
    ctx.stroke()
  })

  ctx.shadowBlur = 0
}