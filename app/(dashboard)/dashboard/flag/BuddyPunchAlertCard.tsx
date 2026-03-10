"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { AlertTriangle, User, MapPin, Clock, Image as ImageIcon, ChevronDown } from "lucide-react"
import type { AlertStatus } from "@/lib/queries/face-recognition"
import { useState } from "react"

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
  const [isOpen, setIsOpen] = useState(false)
  
  const matchPercent = (alert.matchScore * 100).toFixed(0)
  const isNoFaceDetected = alert.matchScore === 0
  const matchLevel = isNoFaceDetected ? "No face" :
                    alert.matchScore < 0.3 ? "Very low" : 
                    alert.matchScore < 0.5 ? "Low" : 
                    alert.matchScore < 0.7 ? "Medium" : "High"
  const matchColor = isNoFaceDetected ? "bg-danger" :
                    alert.matchScore < 0.3 ? "bg-destructive" : 
                    alert.matchScore < 0.5 ? "bg-warning" : 
                    alert.matchScore < 0.7 ? "bg-warning/70" : "bg-success"

  const enrolledPhotoUrl = getImageUrl(alert.enrolledPhotoUrl)
  const capturedPhotoUrl = getImageUrl(alert.capturedPhotoUrl)

  // Status badge configuration
  const getStatusBadge = () => {
    const status = alert.status || "pending"
    
    switch (status) {
      case "confirmed_buddy":
        return { variant: "destructive" as const, label: "Confirmed", className: "" }
      case "false_alarm":
        return { variant: "default" as const, label: "False Alarm", className: "bg-success text-white hover:brightness-90" }
      case "dismissed":
        return { variant: "secondary" as const, label: "Dismissed", className: "" }
      case "pending":
      default:
        return { 
          variant: "default" as const, 
          label: isNoFaceDetected ? "No Face" : "Pending",
          className: "bg-warning text-white hover:brightness-90"
        }
    }
  }

  const statusBadge = getStatusBadge()

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden hover:shadow-md transition-shadow pt-0">
        <CardContent className="p-0">
          {/* Collapsible Trigger - Shows all key info */}
          <CollapsibleTrigger className="w-full p-4 text-left hover:bg-muted/50 transition-colors">
            <div className="flex items-start gap-4">
              {/* Employee Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <h3 className="font-semibold text-base truncate">
                    {alert.employeeId?.name || "Unknown Employee"}
                  </h3>
                  <Badge variant={statusBadge.variant} className={`${statusBadge.className} text-xs`}>
                    {statusBadge.label}
                  </Badge>
                </div>
                
                {/* Metadata Row */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(alert.punchTime).toLocaleDateString("en-US", { 
                      month: "short", 
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit"
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {alert.locationId?.name || "Unknown"}
                  </span>
                  <span className="capitalize px-2 py-0.5 bg-muted rounded text-xs">
                    {alert.punchType}
                  </span>
                </div>

                {/* Match Score Bar */}
                <div className="mt-2">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${matchColor} transition-all`}
                      style={{ width: isNoFaceDetected ? "100%" : `${matchPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Match Score & Chevron */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <div className="text-sm font-medium mb-1">
                    {isNoFaceDetected ? "No Face" : `${matchPercent}%`}
                  </div>
                  <div className="text-xs text-muted-foreground">{matchLevel}</div>
                </div>
                <ChevronDown 
                  className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </div>
            </div>
          </CollapsibleTrigger>

          {/* Collapsible Content - Photos and Actions */}
          <CollapsibleContent>
            <div className="px-4 pb-4 pt-2 border-t">
              {/* Review Info (if reviewed) */}
              {alert.status !== "pending" && alert.reviewedAt && (
                <div className="mb-3 p-2 bg-brand/10 rounded border border-brand/20 text-xs">
                  <span className="text-brand font-medium">
                    Reviewed {new Date(alert.reviewedAt).toLocaleDateString("en-US", { 
                      month: "short", 
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit"
                    })}
                  </span>
                  {alert.notes && <span className="text-muted-foreground"> · {alert.notes}</span>}
                </div>
              )}

              {isNoFaceDetected && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm font-medium text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Camera was covered or no face was visible during clock-in
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This employee has an enrolled face profile but no face was detected. 
                    This could indicate buddy punching or camera obstruction.
                  </p>
                </div>
              )}
              
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                {/* Enrolled Photo */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      Enrolled Photo
                    </span>
                    <span className="text-muted-foreground">
                      {alert.employeeId?.enrolledAt 
                        ? new Date(alert.employeeId.enrolledAt).toLocaleDateString("en-US", { 
                            month: "short", 
                            day: "numeric",
                            year: "numeric"
                          })
                        : "Unknown date"}
                    </span>
                  </div>
                  {enrolledPhotoUrl ? (
                    <div className="relative aspect-[4/3] rounded-lg border overflow-hidden bg-muted">
                      <img 
                        src={enrolledPhotoUrl} 
                        alt="Enrolled" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] rounded-lg border border-dashed bg-muted flex items-center justify-center text-muted-foreground text-xs">
                      No photo
                    </div>
                  )}
                </div>

                {/* Captured Photo */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      Captured Photo
                    </span>
                    <span className="text-muted-foreground">
                      {alert.deviceName || "Unknown device"}
                    </span>
                  </div>
                  {capturedPhotoUrl ? (
                    <div className="relative aspect-[4/3] rounded-lg border overflow-hidden bg-muted">
                      <img 
                        src={capturedPhotoUrl} 
                        alt="Captured" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] rounded-lg border border-dashed bg-muted flex items-center justify-center text-muted-foreground text-xs">
                      {isNoFaceDetected ? "No face detected" : "No photo"}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={alert.status === "confirmed_buddy" ? "destructive" : "outline"}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onReview(alert._id, "confirmed_buddy", isNoFaceDetected ? "Confirmed - no face shown" : "Confirmed as buddy punch")
                  }}
                  disabled={isPending}
                >
                  Confirm
                </Button>
                <Button
                  variant={alert.status === "false_alarm" ? "default" : "outline"}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onReview(alert._id, "false_alarm", isNoFaceDetected ? "Technical issue - legitimate punch" : "False alarm - legitimate punch")
                  }}
                  disabled={isPending}
                  className={alert.status === "false_alarm" ? "bg-success text-white hover:brightness-90" : ""}
                >
                  False Alarm
                </Button>
                <Button
                  variant={alert.status === "dismissed" ? "secondary" : "outline"}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onReview(alert._id, "dismissed")
                  }}
                  disabled={isPending}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
  )
}
