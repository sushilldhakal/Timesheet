"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle } from "lucide-react"
import type { AlertStatus } from "@/lib/queries/face-recognition"

interface BuddyPunchAlertCardProps {
  alert: any
  onReview: (alertId: string, status: AlertStatus, notes?: string) => void
  isPending: boolean
}

/** Auth-protected link for Cloudinary images (proxied via /api/image). */
function getImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.includes("res.cloudinary.com")) {
    return `/api/image?url=${encodeURIComponent(url)}`
  }
  return url
}

export function BuddyPunchAlertCard({ alert, onReview, isPending }: BuddyPunchAlertCardProps) {
  const matchPercent = (alert.matchScore * 100).toFixed(0)
  const isNoFaceDetected = alert.matchScore === 0
  const matchLevel = isNoFaceDetected ? "No face detected" :
                    alert.matchScore < 0.3 ? "Very low" : 
                    alert.matchScore < 0.5 ? "Low" : 
                    alert.matchScore < 0.7 ? "Medium" : "High"
  const matchColor = isNoFaceDetected ? "bg-red-600" :
                    alert.matchScore < 0.3 ? "bg-destructive" : 
                    alert.matchScore < 0.5 ? "bg-orange-500" : 
                    alert.matchScore < 0.7 ? "bg-yellow-500" : "bg-green-500"

  const enrolledPhotoUrl = getImageUrl(alert.enrolledPhotoUrl)
  const capturedPhotoUrl = getImageUrl(alert.capturedPhotoUrl)

  return (
    <Card className="overflow-hidden pt-0">
      <CardHeader className="bg-muted/50 pb-3 pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <CardTitle className="text-base mb-1">
                {alert.employeeId?.name || "Unknown Employee"}
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                <span className="capitalize">{alert.punchType}</span>
                {" · "}
                {new Date(alert.punchTime).toLocaleDateString("en-US", { 
                  month: "short", 
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit"
                })}
                {" · "}
                {alert.locationId?.name || "Unknown Location"}
              </div>
            </div>
          </div>
          <Badge variant="destructive">
            {isNoFaceDetected ? "No Face Detected" : "Pending Review"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {isNoFaceDetected && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm font-medium text-destructive">
              ⚠️ Camera was covered or no face was visible during clock-in
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              This employee has an enrolled face profile but no face was detected. 
              This could indicate buddy punching or camera obstruction.
            </p>
          </div>
        )}
        
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Enrolled Photo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Enrolled Photo
              </label>
              <span className="text-xs text-muted-foreground">
                {alert.employeeId?.enrolledAt 
                  ? new Date(alert.employeeId.enrolledAt).toLocaleDateString("en-US", { 
                      month: "short", 
                      day: "numeric",
                      year: "numeric"
                    })
                  : "Enrollment date unknown"}
              </span>
            </div>
            {enrolledPhotoUrl ? (
              <div className="relative aspect-[4/3] rounded-lg border-2 overflow-hidden bg-muted">
                <img 
                  src={enrolledPhotoUrl} 
                  alt="Enrolled" 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-[4/3] rounded-lg border-2 border-dashed bg-muted flex items-center justify-center text-muted-foreground text-sm">
                No photo available
              </div>
            )}
          </div>

          {/* Captured Photo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Captured Photo
              </label>
              <span className="text-xs text-muted-foreground">
                At clock-in time
              </span>
            </div>
            {capturedPhotoUrl ? (
              <div className="relative aspect-[4/3] rounded-lg border-2 overflow-hidden bg-muted">
                <img 
                  src={capturedPhotoUrl} 
                  alt="Captured" 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-[4/3] rounded-lg border-2 border-dashed bg-muted flex items-center justify-center text-muted-foreground text-sm">
                {isNoFaceDetected ? "No face detected" : "No photo available"}
              </div>
            )}
          </div>
        </div>

        {/* Match Score Progress Bar */}
        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {isNoFaceDetected ? "Face Detection" : `Match score: ${matchPercent}%`}
            </span>
            <span className="text-sm text-muted-foreground">{matchLevel}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full ${matchColor} transition-all`}
              style={{ width: isNoFaceDetected ? "100%" : `${matchPercent}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="destructive"
            onClick={() => onReview(alert._id, "confirmed_buddy", isNoFaceDetected ? "Confirmed - no face shown" : "Confirmed as buddy punch")}
            disabled={isPending}
          >
            ✓ Confirm Buddy Punch
          </Button>
          <Button
            variant="secondary"
            onClick={() => onReview(alert._id, "false_alarm", isNoFaceDetected ? "Technical issue - legitimate punch" : "False alarm - legitimate punch")}
            disabled={isPending}
          >
            ✗ False Alarm
          </Button>
          <Button
            variant="outline"
            onClick={() => onReview(alert._id, "dismissed")}
            disabled={isPending}
          >
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
