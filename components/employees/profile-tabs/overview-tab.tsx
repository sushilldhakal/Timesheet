"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  User, Globe, Briefcase, Shield, Phone as PhoneIcon, 
  CheckCircle2, AlertCircle, Clock as ClockIcon,
} from "lucide-react"
import type { Employee } from "@/lib/api/employees"
import { formatDateLong } from "@/lib/utils/format/date-format"
import { ProfileSectionCard, ProfileInfoGrid, ProfileInfoField } from "@/components/shared/profile"

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
    certifications?: Array<string | {
      type: string
      label?: string
      required: boolean
      provided: boolean
      expiryDate?: string
      documentUrl?: string
    }>
    emergencyContact?: {
      name?: string
      phone?: string
    }
    address?: {
      line1?: string
      line2?: string
      city?: string
      state?: string
      postcode?: string
      country?: string
    }
    onboardingCompleted?: boolean
    onboardingCompletedAt?: string | null
    onboardingStatus?: {
      personal: boolean
      identity: boolean
      tax: boolean
      bank: boolean
    }
    passwordSetupExpiry?: string | null
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

  const locationNames = employee.locations?.map(l => l.name).join(", ")
  const roleNames = employee.teams?.filter(r => r.isActive).map(r => r.team.name).join(", ")
  
  // Format full address
  const fullAddress = employee.address 
    ? [
        employee.address.line1,
        employee.address.line2,
        [employee.address.city, employee.address.state, employee.address.postcode].filter(Boolean).join(" "),
        employee.address.country,
      ].filter(Boolean).join(", ")
    : employee.homeAddress || null

  // Check if onboarding is pending and invite is expiring
  const onboardingPending = employee.onboardingCompleted === false
  const inviteExpiring = onboardingPending && employee.passwordSetupExpiry 
    ? new Date(employee.passwordSetupExpiry) < new Date(Date.now() + 24 * 60 * 60 * 1000) // expires within 24h
    : false

  return (
    <div className="space-y-6">
      {/* Onboarding Status Warning */}
      {onboardingPending && (
        <div className="p-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-500/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-amber-900 dark:text-amber-100">Onboarding Incomplete</h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                This employee has not completed their onboarding process yet.
                {inviteExpiring && employee.passwordSetupExpiry && (
                  <span className="block mt-1 font-medium">
                    ⚠️ Setup link expires: {formatDateLong(employee.passwordSetupExpiry)}
                  </span>
                )}
              </p>
              {employee.onboardingStatus && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <OnboardingStepBadge label="Personal" completed={employee.onboardingStatus.personal} />
                  <OnboardingStepBadge label="Identity" completed={employee.onboardingStatus.identity} />
                  <OnboardingStepBadge label="Tax" completed={employee.onboardingStatus.tax} />
                  <OnboardingStepBadge label="Bank" completed={employee.onboardingStatus.bank} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
            <ProfileInfoField label="Home Address" value={fullAddress} span={2} />
          </ProfileInfoGrid>
        </ProfileSectionCard>

        {/* Emergency Contact */}
        {employee.emergencyContact && (employee.emergencyContact.name || employee.emergencyContact.phone) && (
          <ProfileSectionCard
            title="Emergency Contact"
            icon={<PhoneIcon className="h-4 w-4 text-muted-foreground" />}
          >
            <ProfileInfoGrid columns={2}>
              <ProfileInfoField label="Name" value={employee.emergencyContact.name} />
              <ProfileInfoField label="Phone" value={employee.emergencyContact.phone} />
            </ProfileInfoGrid>
          </ProfileSectionCard>
        )}

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

      {/* Identity & Work Rights - Only show if compliance tab would have data */}
      {employee.nationality && onNavigate && (
        <ProfileSectionCard
          title="Identity & Work Rights"
          icon={<Shield className="h-4 w-4 text-muted-foreground" />}
          actions={
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onNavigate('compliance')}
              className="text-xs"
            >
              View Full Compliance →
            </Button>
          }
        >
          <ProfileInfoGrid columns={3}>
            <ProfileInfoField label="Nationality" value={employee.nationality} />
            <ProfileInfoField 
              label="Work Rights" 
              value={
                employee.nationality?.toLowerCase().includes('austral') 
                  ? 'Australian Citizen/Resident' 
                  : 'Visa Holder'
              } 
            />
            <ProfileInfoField 
              label="Verification Status" 
              value={
                <Badge variant="outline" className="text-amber-600 dark:text-amber-400">
                  Pending Verification
                </Badge>
              } 
            />
          </ProfileInfoGrid>
          <p className="text-xs text-muted-foreground mt-3">
            Full identity documents and compliance certifications are available in the Compliance tab.
          </p>
        </ProfileSectionCard>
      )}

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
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Required Certifications</p>
                <div className="flex flex-wrap gap-1.5">
                  {employee.certifications.map((c, idx) => {
                    if (typeof c === 'string') {
                      return <Badge key={idx} variant="outline">{c}</Badge>
                    }
                    const label = c.type === 'other' ? c.label : formatCertType(c.type)
                    return (
                      <Badge 
                        key={idx} 
                        variant={c.provided ? "default" : "outline"}
                        className={c.provided ? "bg-emerald-500/10 text-emerald-700 border-emerald-200" : ""}
                      >
                        {label} {c.provided ? "✓" : "⏳"}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </ProfileSectionCard>
      )}

      
    </div>
  )
}

function OnboardingStepBadge({ label, completed }: { label: string; completed: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
      completed 
        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
        : 'bg-muted text-muted-foreground border'
    }`}>
      {completed ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <ClockIcon className="h-3 w-3" />
      )}
      {label}
    </div>
  )
}

function formatCertType(type: string): string {
  const map: Record<string, string> = {
    wwcc: 'WWCC',
    police_check: 'Police Clearance',
    food_safety: 'Food Safety',
    rsa: 'RSA',
  }
  return map[type] || type
}
