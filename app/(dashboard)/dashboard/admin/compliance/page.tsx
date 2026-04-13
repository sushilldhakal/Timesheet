'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Download, RefreshCw } from 'lucide-react'
import { getEmployees } from '@/lib/api/employees'
import {
  calculateComplianceStats,
  getComplianceBreakdown,
  getComplianceIssues,
  generateComplianceReport,
} from '@/lib/utils/compliance-dashboard'
import { ComplianceOverviewCard } from '@/components/admin/compliance/ComplianceOverviewCard'
import { ComplianceBreakdownCard } from '@/components/admin/compliance/ComplianceBreakdownCard'
import { ComplianceIssuesTable } from '@/components/admin/compliance/ComplianceIssuesTable'
import { ComplianceExpiryCalendar } from '@/components/admin/compliance/ComplianceExpiryCalendar'
import { toast } from 'sonner'
import type { EmployeeComplianceRecord } from '@/lib/api/employees'

export default function AdminComplianceDashboardPage() {
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning'>('all')
  const [issueTypeFilter, setIssueTypeFilter] = useState<string>('all')

  const { data: employeesResponse, isLoading: employeesLoading, refetch: refetchEmployees } = useQuery({
    queryKey: ['employees', 'admin-compliance'],
    queryFn: () => getEmployees({ limit: 1000, offset: 0 }),
  })

  const { data: complianceData = [], refetch: refetchCompliance } = useQuery<EmployeeComplianceRecord[]>({
    queryKey: ['compliance', 'all'],
    queryFn: async () => {
      // When a bulk compliance API exists, fetch from it here.
      // For now, returning empty array — stats show 100% critical (no data).
      return []
    },
  })

  const employees = employeesResponse?.employees ?? []

  const stats = useMemo(() => {
    if (employees.length === 0) return null
    return calculateComplianceStats(employees, complianceData)
  }, [employees, complianceData])

  const breakdown = useMemo(() => getComplianceBreakdown(complianceData), [complianceData])

  const allIssues = useMemo(() => {
    if (employees.length === 0) return []
    return getComplianceIssues(employees, complianceData)
  }, [employees, complianceData])

  const filteredIssues = useMemo(() => {
    return allIssues.filter((issue) => {
      if (severityFilter !== 'all' && issue.severity !== severityFilter) return false
      if (issueTypeFilter !== 'all' && issue.issueType !== issueTypeFilter) return false
      return true
    })
  }, [allIssues, severityFilter, issueTypeFilter])

  const handleExportReport = () => {
    if (!stats) return
    const report = generateComplianceReport(stats, breakdown, allIssues)
    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Report downloaded successfully')
  }

  const handleRefresh = () => {
    refetchEmployees()
    refetchCompliance()
    toast.info('Refreshing compliance data...')
  }

  const issueTypes = [...new Set(allIssues.map((i) => i.issueType))]

  if (employeesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compliance Dashboard</h1>
          <p className="text-muted-foreground mt-1">Organization-wide compliance monitoring and reporting</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={handleExportReport} disabled={!stats}>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {stats && (
        <ComplianceOverviewCard
          totalEmployees={stats.totalEmployees}
          fullyCurrent={stats.fullyCurrent}
          warningCount={stats.warningCount}
          criticalCount={stats.criticalCount}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ComplianceBreakdownCard breakdown={breakdown} />
        <ComplianceExpiryCalendar issues={allIssues} />
      </div>

      <Card>
        <CardHeader><CardTitle>Filter Issues</CardTitle></CardHeader>
        <CardContent className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-48">
            <label className="text-sm font-medium">Severity</label>
            <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as 'all' | 'critical' | 'warning')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical Only</SelectItem>
                <SelectItem value="warning">Warnings Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-48">
            <label className="text-sm font-medium">Issue Type</label>
            <Select value={issueTypeFilter} onValueChange={setIssueTypeFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {issueTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <ComplianceIssuesTable issues={filteredIssues} showAll />
    </div>
  )
}
