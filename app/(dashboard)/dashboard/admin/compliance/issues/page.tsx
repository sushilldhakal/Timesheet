'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { useEmployees } from '@/lib/queries/employees'
import { getComplianceIssues } from '@/lib/utils/compliance-dashboard'
import { ComplianceIssuesTable } from '@/components/admin/compliance/ComplianceIssuesTable'
import type { EmployeeComplianceRecord } from '@/lib/api/employees'

export default function ComplianceIssuesPage() {
  const { data: employeesResponse, isLoading } = useEmployees(1000)

  const { data: complianceData = [] } = useQuery<EmployeeComplianceRecord[]>({
    queryKey: ['compliance', 'all'],
    queryFn: async () => [],
  })

  const employees = employeesResponse?.employees ?? []
  const allIssues = useMemo(() => getComplianceIssues(employees, complianceData), [employees, complianceData])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">All Compliance Issues</h1>
        <p className="text-muted-foreground mt-1">
          Showing {allIssues.length} {allIssues.length === 1 ? 'issue' : 'issues'}
        </p>
      </div>

      <ComplianceIssuesTable issues={allIssues} showAll />
    </div>
  )
}
