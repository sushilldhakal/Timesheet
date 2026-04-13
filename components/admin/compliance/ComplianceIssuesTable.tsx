'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, AlertTriangle, Eye } from 'lucide-react'
import Link from 'next/link'
import type { ComplianceIssue } from '@/lib/utils/compliance-dashboard'

interface ComplianceIssuesTableProps {
  issues: ComplianceIssue[]
  showAll?: boolean
}

export function ComplianceIssuesTable({ issues, showAll = false }: ComplianceIssuesTableProps) {
  const displayIssues = showAll ? issues : issues.slice(0, 10)

  if (issues.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Issues & Alerts</CardTitle>
          <CardDescription>No compliance issues found</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 p-6 text-center">
            <p className="text-green-800 dark:text-green-300 font-semibold">All employees are compliant!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Issues & Alerts</CardTitle>
        <CardDescription>
          {issues.length} {issues.length === 1 ? 'issue' : 'issues'} found
          {!showAll && issues.length > 10 && ` (showing 10 of ${issues.length})`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Issue Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayIssues.map((issue, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{issue.employeeName}</TableCell>
                  <TableCell><Badge variant="outline">{issue.issueType}</Badge></TableCell>
                  <TableCell className="text-sm">
                    {issue.description}
                    {issue.daysUntilExpiry != null && issue.daysUntilExpiry < 0 && (
                      <span className="ml-2 text-red-600 font-semibold">(expired {Math.abs(issue.daysUntilExpiry)} days ago)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {issue.severity === 'critical' ? (
                        <>
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <Badge variant="destructive">Critical</Badge>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <Badge variant="secondary" className="bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-400">Warning</Badge>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/dashboard/employees/${issue.employeeId}`}>
                      <Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {!showAll && issues.length > 10 && (
          <div className="mt-4 text-center">
            <Link href="/dashboard/admin/compliance/issues">
              <Button variant="outline">View All {issues.length} Issues</Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
