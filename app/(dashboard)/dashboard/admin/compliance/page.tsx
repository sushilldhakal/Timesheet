'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Download, RefreshCw, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react'
import { useEmployees } from '@/lib/queries/employees'
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
import { ViolationsTable } from '@/components/admin/compliance/ViolationsTable'
import { useComplianceViolations } from '@/lib/hooks/use-compliance-violations'
import { toast } from 'sonner'
import type { EmployeeComplianceRecord } from '@/lib/api/employees'
import { subDays } from 'date-fns'

export default function AdminComplianceDashboardPage() {
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning'>('all')
  const [issueTypeFilter, setIssueTypeFilter] = useState<string>('all')

  const { data: employeesResponse, isLoading: employeesLoading, refetch: refetchEmployees } = useEmployees(1000)

  const { data: complianceData = [], refetch: refetchCompliance } = useQuery<EmployeeComplianceRecord[]>({
    queryKey: ['compliance', 'all'],
    queryFn: async () => {
      // When a bulk compliance API exists, fetch from it here.
      // For now, returning empty array — stats show 100% critical (no data).
      return []
    },
  })

  // Real violation data from the ComplianceViolation collection
  const { data: violations = [], refetch: refetchViolations } = useComplianceViolations()
  const openViolations = violations.filter((v) => v.isActive)
  const resolvedThisWeek = violations.filter(
    (v) => !v.isActive && v.resolvedAt && new Date(v.resolvedAt) >= subDays(new Date(), 7)
  )
  const mostCommonRuleType = (() => {
    if (openViolations.length === 0) return null
    const counts: Record<string, number> = {}
    for (const v of openViolations) counts[v.ruleType] = (counts[v.ruleType] ?? 0) + 1
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  })()

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
    refetchViolations()
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
        <CardContent className="pt-6 flex gap-4 flex-wrap">
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

      {/* Shift-level Compliance Violations (from ComplianceEngine) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Shift Compliance Violations</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time violations detected by the compliance engine during roster saves and clock events
          </p>
        </div>

        {/* Violation summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-red-100 dark:bg-red-900/40 p-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{openViolations.length}</p>
                  <p className="text-sm text-muted-foreground">Open Violations</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 dark:border-green-900">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-100 dark:bg-green-900/40 p-2">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{resolvedThisWeek.length}</p>
                  <p className="text-sm text-muted-foreground">Resolved This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900/40 p-2">
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-lg font-bold truncate">
                    {mostCommonRuleType
                      ? mostCommonRuleType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
                      : '—'}
                  </p>
                  <p className="text-sm text-muted-foreground">Most Common Breach</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <ViolationsTable />
      </div>
    </div>
  )
}
