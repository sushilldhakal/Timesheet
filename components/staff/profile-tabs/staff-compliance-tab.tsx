'use client'

import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { getEmployeeCompliance } from '@/lib/api/employees'
import { ComplianceAlertBanner } from '@/components/employees/compliance/ComplianceAlertBanner'
import { ComplianceStatusTable } from '@/components/employees/compliance/ComplianceStatusTable'

interface StaffComplianceTabProps {
  employeeId: string
}

export function StaffComplianceTab({ employeeId }: StaffComplianceTabProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['employeeCompliance', employeeId],
    queryFn: () => getEmployeeCompliance(employeeId),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const compliance = data?.compliance

  if (!compliance) {
    return (
      <div className="rounded-md bg-muted/50 p-8 text-center border border-dashed">
        <p className="font-medium text-muted-foreground">No compliance data available</p>
        <p className="text-sm text-muted-foreground mt-1">Contact HR to set up your compliance records</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ComplianceAlertBanner compliance={compliance} />
      <ComplianceStatusTable compliance={compliance} />
    </div>
  )
}
