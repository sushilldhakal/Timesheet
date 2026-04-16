"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  User, Globe, Calendar, MapPin, Briefcase, Clock,
  FileText, ClipboardList, CalendarDays,
} from "lucide-react"
import type { Employee } from "@/lib/api/employees"
import { formatDateLong } from "@/lib/utils/format/date-format"

interface OverviewTabProps {
  employee: Employee & {
    legalFirstName?: string
    legalMiddleNames?: string
    legalLastName?: string
    preferredName?: string
    timeZone?: string
    locale?: string
    nationality?: string
    isActive?: boolean
    isProbationary?: boolean
    probationEndDate?: string | null
    terminatedAt?: string | null
    terminationReason?: string
    skills?: string[]
    certifications?: string[]
  }
  onNavigate?: (tab: string) => void
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value || <span className="text-muted-foreground">—</span>}</p>
    </div>
  )
}

function StatusBadge({ isActive, isProbationary, terminatedAt }: { isActive?: boolean; isProbationary?: boolean; terminatedAt?: string | null }) {
  if (terminatedAt) {
    return <Badge variant="destructive">Terminated</Badge>
  }
  if (isActive === false) {
    return <Badge variant="secondary">Inactive</Badge>
  }
  if (isProbationary) {
    return (
      <div className="flex items-center gap-1.5">
        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">Active</Badge>
        <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">Probation</Badge>
      </div>
    )
  }
  return <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">Active</Badge>
}

export function OverviewTab({ employee, onNavigate }: OverviewTabProps) {
  const legalName = [employee.legalFirstName, employee.legalMiddleNames, employee.legalLastName]
    .filter(Boolean)
    .join(" ")

  const activeContract = employee.roles?.find(r => r.isActive)
  const locationNames = employee.locations?.map(l => l.name).join(", ")
  const roleNames = employee.roles?.filter(r => r.isActive).map(r => r.role.name).join(", ")

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <InfoRow label="Display Name" value={employee.name} />
            <InfoRow label="Legal Name" value={legalName || null} />
            <InfoRow label="Preferred Name" value={employee.preferredName} />
            <InfoRow label="Date of Birth" value={employee.dob ? formatDateLong(employee.dob) || employee.dob : null} />
            <InfoRow label="Gender" value={employee.gender} />
            <InfoRow label="Email" value={employee.email} />
            <InfoRow label="Phone" value={employee.phone} />
            <InfoRow label="Home Address" value={employee.homeAddress} />
          </CardContent>
        </Card>

        {/* Employment Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              Employment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Status:</span>
              <StatusBadge
                isActive={employee.isActive}
                isProbationary={employee.isProbationary}
                terminatedAt={employee.terminatedAt}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {employee.isProbationary && employee.probationEndDate && (
                <InfoRow label="Probation Ends" value={formatDateLong(employee.probationEndDate) || employee.probationEndDate} />
              )}
              <InfoRow label="Employment Type" value={employee.employmentType} />
              <InfoRow label="Standard Hours/Week" value={employee.standardHoursPerWeek != null ? `${employee.standardHoursPerWeek} hrs` : null} />
              <InfoRow label="Current Teams" value={roleNames} />
              <InfoRow label="Locations" value={locationNames} />
              {employee.award && (
                <>
                  <InfoRow label="Award" value={employee.award.name} />
                  <InfoRow label="Award Level" value={employee.award.level} />
                </>
              )}
            </div>

            {employee.terminatedAt && (
              <div className="mt-3 p-3 rounded-md bg-destructive/5 border border-destructive/10">
                <p className="text-xs font-medium text-destructive">Terminated: {formatDateLong(employee.terminatedAt) || employee.terminatedAt}</p>
                {employee.terminationReason && (
                  <p className="text-xs text-muted-foreground mt-1">Reason: {employee.terminationReason}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Locale & Preferences */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            Locale & Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <InfoRow label="Time Zone" value={employee.timeZone || "Australia/Sydney"} />
          <InfoRow label="Locale" value={employee.locale || "en-AU"} />
          <InfoRow label="Nationality" value={employee.nationality} />
          <InfoRow label="PIN" value={employee.pin} />
        </CardContent>
      </Card>

      {/* Skills & Certifications */}
      {((employee.skills && employee.skills.length > 0) || (employee.certifications && employee.certifications.length > 0)) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Skills & Certifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {employee.skills && employee.skills.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {employee.skills.map((s) => (
                    <Badge key={s} variant="secondary">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
            {employee.certifications && employee.certifications.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Certifications</p>
                <div className="flex flex-wrap gap-1.5">
                  {employee.certifications.map((c) => (
                    <Badge key={c} variant="outline">{c}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      {onNavigate && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm" onClick={() => onNavigate("payroll")}>
                <FileText className="h-4 w-4 mr-1.5" />
                View Payroll
              </Button>
              <Button variant="outline" size="sm" onClick={() => onNavigate("compliance")}>
                <ClipboardList className="h-4 w-4 mr-1.5" />
                View Compliance
              </Button>
              <Button variant="outline" size="sm" onClick={() => onNavigate("contract")}>
                <Calendar className="h-4 w-4 mr-1.5" />
                View Contract
              </Button>
              <Button variant="outline" size="sm" onClick={() => onNavigate("development")}>
                <CalendarDays className="h-4 w-4 mr-1.5" />
                Qualifications
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
