"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  User, Globe, Calendar, MapPin, Briefcase, Clock,
  FileText, ClipboardList, CalendarDays,
} from "lucide-react"
import type { Employee } from "@/lib/api/employees"
import { formatDateLong } from "@/lib/utils/format/date-format"
import { ProfileSectionCard, ProfileInfoGrid, ProfileInfoField, ProfileActionSection } from "@/components/shared/profile"

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
        <ProfileSectionCard
          title="Personal Information"
          icon={<User className="h-4 w-4 text-muted-foreground" />}
        >
          <ProfileInfoGrid columns={2}>
            <ProfileInfoField label="Display Name" value={employee.name} />
            <ProfileInfoField label="Legal Name" value={legalName || null} />
            <ProfileInfoField label="Preferred Name" value={employee.preferredName} />
            <ProfileInfoField label="Date of Birth" value={employee.dob ? formatDateLong(employee.dob) || employee.dob : null} />
            <ProfileInfoField label="Gender" value={employee.gender} />
            <ProfileInfoField label="Email" value={employee.email} />
            <ProfileInfoField label="Phone" value={employee.phone} />
            <ProfileInfoField label="Home Address" value={employee.homeAddress} span={2} />
          </ProfileInfoGrid>
        </ProfileSectionCard>

        {/* Employment Details */}
        <ProfileSectionCard
          title="Employment Details"
          icon={<Briefcase className="h-4 w-4 text-muted-foreground" />}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Status:</span>
              <StatusBadge
                isActive={employee.isActive}
                isProbationary={employee.isProbationary}
                terminatedAt={employee.terminatedAt}
              />
            </div>

            <ProfileInfoGrid columns={2}>
              {employee.isProbationary && employee.probationEndDate && (
                <ProfileInfoField 
                  label="Probation Ends" 
                  value={formatDateLong(employee.probationEndDate) || employee.probationEndDate} 
                />
              )}
              <ProfileInfoField label="Employment Type" value={employee.employmentType} />
              <ProfileInfoField 
                label="Standard Hours/Week" 
                value={employee.standardHoursPerWeek != null ? `${employee.standardHoursPerWeek} hrs` : null} 
              />
              <ProfileInfoField label="Current Teams" value={roleNames} />
              <ProfileInfoField label="Locations" value={locationNames} />
              {employee.award && (
                <>
                  <ProfileInfoField label="Award" value={employee.award.name} />
                  <ProfileInfoField label="Award Level" value={employee.award.level} />
                </>
              )}
            </ProfileInfoGrid>

            {employee.terminatedAt && (
              <div className="mt-3 p-3 rounded-md bg-destructive/5 border border-destructive/10">
                <p className="text-xs font-medium text-destructive">
                  Terminated: {formatDateLong(employee.terminatedAt) || employee.terminatedAt}
                </p>
                {employee.terminationReason && (
                  <p className="text-xs text-muted-foreground mt-1">Reason: {employee.terminationReason}</p>
                )}
              </div>
            )}
          </div>
        </ProfileSectionCard>
      </div>

      {/* Locale & Preferences */}
      <ProfileSectionCard
        title="Locale & Preferences"
        icon={<Globe className="h-4 w-4 text-muted-foreground" />}
      >
        <ProfileInfoGrid columns={4}>
          <ProfileInfoField label="Time Zone" value={employee.timeZone || "Australia/Sydney"} />
          <ProfileInfoField label="Locale" value={employee.locale || "en-AU"} />
          <ProfileInfoField label="Nationality" value={employee.nationality} />
          <ProfileInfoField label="PIN" value={employee.pin} />
        </ProfileInfoGrid>
      </ProfileSectionCard>

      {/* Skills & Certifications */}
      {((employee.skills && employee.skills.length > 0) || (employee.certifications && employee.certifications.length > 0)) && (
        <ProfileSectionCard title="Skills & Certifications">
          <div className="space-y-3">
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
          </div>
        </ProfileSectionCard>
      )}

      {/* Quick Actions */}
      {onNavigate && (
        <ProfileSectionCard title="Quick Actions">
          <ProfileActionSection
            actions={[
              {
                label: "View Payroll",
                onClick: () => onNavigate("payroll"),
                icon: <FileText className="h-4 w-4" />,
                variant: "outline",
              },
              {
                label: "View Compliance",
                onClick: () => onNavigate("compliance"),
                icon: <ClipboardList className="h-4 w-4" />,
                variant: "outline",
              },
              {
                label: "View Contract",
                onClick: () => onNavigate("contract"),
                icon: <Calendar className="h-4 w-4" />,
                variant: "outline",
              },
              {
                label: "Qualifications",
                onClick: () => onNavigate("development"),
                icon: <CalendarDays className="h-4 w-4" />,
                variant: "outline",
              },
            ]}
          />
        </ProfileSectionCard>
      )}
    </div>
  )
}
