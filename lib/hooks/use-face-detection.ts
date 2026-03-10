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
  /**
   * Returns the face descriptor (embedding) captured at the same time as the blob.
   * Returns null if no face was detected or embedding not available.
   */
  getLatestDescriptor: () => number[] | null
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
  const humanRef       = useRef<any>(null)

  // The ONE blob captured the first time face is stable — never overwritten
  const capturedBlob   = useRef<Blob | null>(null)
  // The face descriptor captured at the same time as the blob
  const capturedDescriptor = useRef<number[] | null>(null)
  // Stops capture loop once we have our blob
  const hasCaptured    = useRef(false)

  const [status, setStatus]             = useState<FaceStatus>("loading")
  const [modelsLoaded, setModelsLoaded] = useState(false)

  // ── Single frame capture ───────────────────────────────────────────────────
  const captureOnce = useCallback((): Promise<Blob | null> =>
    new Promise((resolve) => {
      const video = webcamRef.current?.video as HTMLVideoElement | undefined

      if (!video || video.readyState < 2) return resolve(null)

      const sourceWidth = video.videoWidth
      const sourceHeight = video.videoHeight
      if (!sourceWidth || !sourceHeight) return resolve(null)

      const targetWidth = captureWidth || sourceWidth
      const targetHeight = captureHeight || sourceHeight

      const canvas = document.createElement("canvas")
      canvas.width = targetWidth
      canvas.height = targetHeight

      const ctx = canvas.getContext("2d")
      if (!ctx) return resolve(null)

      // Center-crop to target ratio so mobile captures don't look stretched.
      const sourceRatio = sourceWidth / sourceHeight
      const targetRatio = targetWidth / targetHeight
      let sx = 0
      let sy = 0
      let sw = sourceWidth
      let sh = sourceHeight

      if (sourceRatio > targetRatio) {
        sw = sourceHeight * targetRatio
        sx = (sourceWidth - sw) / 2
      } else if (sourceRatio < targetRatio) {
        sh = sourceWidth / targetRatio
        sy = (sourceHeight - sh) / 2
      }

      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight)
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

  // ── Load Human library ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        // Use local .mjs copy to avoid webpack resolution issues
        const { default: Human } = await import("@/lib/services/human-browser")
        
        const human = new Human({
          modelBasePath: "/models",
          face: {
            enabled: true,
            detector: { 
              enabled: true,
              rotation: false,
              maxDetected: 1,
              minConfidence: minScore,
              return: true
            },
            description: { enabled: true }, // Generate face embeddings for recognition
            mesh: { enabled: false },
            iris: { enabled: false },
            emotion: { enabled: false },
            antispoof: { enabled: false },
            liveness: { enabled: false }
          },
          body: { enabled: false },
          hand: { enabled: false },
          object: { enabled: false },
          gesture: { enabled: false },
          filter: { enabled: false }
        })

        // Load models with error handling
        await human.load({})
        
        // Warmup with a small delay for mobile devices
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Warmup models for faster first detection
        await human.warmup({})
        
        if (!cancelled) {
          humanRef.current = human
          setModelsLoaded(true)
          setStatus("no_face")
        }
      } catch (err) {
        console.error("[FaceDetection] Human library load failed:", err)
        if (!cancelled) setStatus("error")
      }
    }
    load()
    return () => { cancelled = true }
  }, [minScore])

  // ── Detection loop — stops itself once blob is captured ───────────────────
  useEffect(() => {
    if (!modelsLoaded || !humanRef.current) return

    async function detect() {
      // Already have our image — nothing left to do
      if (hasCaptured.current) {
        stopLoop()
        return
      }

      const human = humanRef.current
      const video = webcamRef.current?.video
      const canvas = canvasRef.current
      if (!video || video.readyState < 2 || !canvas || !human) return

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
        const result = await human.detect(video)
        
        // Check if result is valid
        if (!result || !result.face) {
          stableFrames.current = 0
          setStatus("no_face")
          return
        }
        
        if (result.face.length === 0) {
          stableFrames.current = 0
          setStatus("no_face")
          return
        }

        const face = result.face[0]
        
        // Validate face object
        if (!face || !face.box) {
          stableFrames.current = 0
          setStatus("no_face")
          return
        }
        
        const box = face.box
        const score = face.score || face.boxScore || 0

        if (score < minScore) {
          stableFrames.current = 0
          setStatus("no_face")
          return
        }

        const [x, y, width, height] = box
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

          // Stop detection loop — job done, no more CPU/memory usage
          stopLoop()

          // Clear the canvas overlay — no need to keep drawing the box
          ctx.clearRect(0, 0, vw, vh)

          // Capture the photo blob
          captureOnce().then(blob => { 
            capturedBlob.current = blob 
          })

          // Capture the face descriptor from the embedding
          const embedding = result.face?.[0]?.embedding
          if (embedding) {
            capturedDescriptor.current = Array.from(embedding)
            console.log('[FaceDetection] Captured descriptor:', capturedDescriptor.current.length, 'floats')
          } else {
            console.warn('[FaceDetection] No embedding found in face result')
          }
        }
      } catch (err) {
        // Silently handle per-frame errors on mobile
        const errorMessage = err instanceof Error ? err.message : String(err)
        
        // Only log if it's not the common inputNodes error
        if (!errorMessage.includes('inputNodes') && !errorMessage.includes('executor')) {
          console.error("[FaceDetection] Detection error:", err)
        }
        
        // Reset status on persistent errors
        if (stableFrames.current > 0) {
          stableFrames.current = 0
          setStatus("no_face")
        }
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

  // ── Public: get the captured descriptor ───────────────────────────────────
  const getLatestDescriptor = useCallback(() => capturedDescriptor.current, [])

  // ── Reset for next staff member ────────────────────────────────────────────
  const reset = useCallback(() => {
    capturedBlob.current = null
    capturedDescriptor.current = null
    hasCaptured.current  = false
    stableFrames.current = 0
    setStatus("no_face")

    // Restart detection loop for next person
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [])

  return { status, modelsLoaded, canvasRef, getLatestBlob, getLatestDescriptor, reset }
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