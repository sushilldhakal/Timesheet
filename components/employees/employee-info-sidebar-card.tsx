"use client"

import { Card, CardContent } from "@/components/ui/card"
import { OptimizedImage } from "@/components/ui/optimized-image"
import { Building2, Calendar, Clock, Home, Mail, MessageSquare, Phone } from "lucide-react"

type EmployerChip = {
  name: string
  color?: string
}

export type EmployeeInfoSidebarCardProps = {
  name: string
  pin: string
  img?: string
  email?: string
  phone?: string
  dob?: string
  homeAddress?: string
  standardHoursPerWeek?: number | null
  comment?: string
  employers?: EmployerChip[]
  /**
   * Optional image to use when no profile image exists.
   * (Employee detail page uses first timesheet clock-in photo here.)
   */
  fallbackImageUrl?: string
  formatDob?: (dob: string) => string
}

export function EmployeeInfoSidebarCard({
  name,
  pin,
  img,
  email,
  phone,
  dob,
  homeAddress,
  standardHoursPerWeek,
  comment,
  employers,
  fallbackImageUrl,
  formatDob,
}: EmployeeInfoSidebarCardProps) {
  const displayName = name?.trim() ? name : "—"
  const imageSrc = img || fallbackImageUrl || ""

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center gap-3">
          <OptimizedImage
            src={imageSrc}
            alt={displayName}
            width={96}
            height={96}
            className="rounded-full object-cover w-24 h-24"
            fallbackName={displayName}
          />

          <div className="text-center space-y-2 w-full">
            <div>
              <p className="font-semibold text-lg">{displayName}</p>
              <p className="text-sm text-muted-foreground">PIN: {pin || "—"}</p>
            </div>

            {employers && employers.length > 0 && (
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex items-center gap-1 flex-wrap justify-center">
                  {employers.map((emp, idx) => (
                    <span
                      key={`${emp.name}-${idx}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-secondary"
                    >
                      {emp.color && (
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: emp.color }}
                        />
                      )}
                      {emp.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t">
          {email ? (
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">Email</p>
                <p className="text-sm break-all">{email}</p>
              </div>
            </div>
          ) : null}

          {phone ? (
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">Phone</p>
                <p className="text-sm">{phone}</p>
              </div>
            </div>
          ) : null}

          {dob ? (
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">Date of Birth</p>
                <p className="text-sm">{formatDob ? formatDob(dob) : dob}</p>
              </div>
            </div>
          ) : null}

          {homeAddress ? (
            <div className="flex items-start gap-2">
              <Home className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">Home Address</p>
                <p className="text-sm">{homeAddress}</p>
              </div>
            </div>
          ) : null}

          {standardHoursPerWeek !== null && standardHoursPerWeek !== undefined ? (
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">Standard Hours/Week</p>
                <p className="text-sm">{standardHoursPerWeek} hrs</p>
              </div>
            </div>
          ) : null}

          {comment && comment.trim() ? (
            <div className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">Notes</p>
                <p className="text-sm text-muted-foreground italic">{comment}</p>
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

