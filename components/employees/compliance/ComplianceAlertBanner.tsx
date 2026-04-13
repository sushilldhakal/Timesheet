'use client'

import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { differenceInDays } from 'date-fns'

interface ComplianceStatus {
  status: string | null | undefined
  expiryDate?: string | null
  label: string
}

interface ComplianceAlertBannerProps {
  compliance: {
    wwcStatus?: string | null
    wwcExpiryDate?: string | null
    policeClearanceStatus?: string | null
    policeClearanceExpiryDate?: string | null
    foodHandlingStatus?: string | null
    foodHandlingExpiryDate?: string | null
  }
}

export function ComplianceAlertBanner({ compliance }: ComplianceAlertBannerProps) {
  const statuses: ComplianceStatus[] = [
    {
      status: compliance.wwcStatus,
      expiryDate: compliance.wwcExpiryDate,
      label: 'Working With Children Check (WWC)',
    },
    {
      status: compliance.policeClearanceStatus,
      expiryDate: compliance.policeClearanceExpiryDate,
      label: 'Police Clearance',
    },
    {
      status: compliance.foodHandlingStatus,
      expiryDate: compliance.foodHandlingExpiryDate,
      label: 'Food Handling Certification',
    },
  ]

  const criticalIssues = statuses.filter((s) => {
    if (s.status === 'expired') return true
    if (s.status === 'pending') return true
    if (s.expiryDate) {
      const daysLeft = differenceInDays(new Date(s.expiryDate), new Date())
      return daysLeft < 0
    }
    return false
  })

  const warningIssues = statuses.filter((s) => {
    if (criticalIssues.includes(s)) return false
    if (s.expiryDate) {
      const daysLeft = differenceInDays(new Date(s.expiryDate), new Date())
      return daysLeft >= 0 && daysLeft < 90
    }
    return false
  })

  const compliantCount = statuses.filter(
    (s) => s.status === 'active' || s.status === 'current' || s.status === 'not_required'
  ).length

  if (criticalIssues.length === 0 && warningIssues.length === 0) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800 dark:text-green-300">
          All compliance requirements are current. ({compliantCount}/{statuses.length} items)
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-3">
      {criticalIssues.length > 0 && (
        <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-300">
            <div className="font-semibold">Critical Compliance Issues</div>
            <ul className="mt-2 space-y-1">
              {criticalIssues.map((issue) => (
                <li key={issue.label} className="text-sm">
                  • {issue.label}
                  {issue.status === 'expired' && ' — EXPIRED'}
                  {issue.status === 'pending' && ' — PENDING'}
                  {issue.expiryDate && issue.status !== 'expired' && issue.status !== 'pending' && (
                    <> — expires in {differenceInDays(new Date(issue.expiryDate), new Date())} days</>
                  )}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {warningIssues.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-300">
            <div className="font-semibold">Upcoming Compliance Expirations</div>
            <ul className="mt-2 space-y-1">
              {warningIssues.map((issue) => (
                <li key={issue.label} className="text-sm">
                  • {issue.label} — expires in {differenceInDays(new Date(issue.expiryDate!), new Date())} days
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
