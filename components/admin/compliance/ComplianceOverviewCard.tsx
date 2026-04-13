'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react'

interface ComplianceOverviewCardProps {
  totalEmployees: number
  fullyCurrent: number
  warningCount: number
  criticalCount: number
}

export function ComplianceOverviewCard({
  totalEmployees,
  fullyCurrent,
  warningCount,
  criticalCount,
}: ComplianceOverviewCardProps) {
  const compliantPercentage = totalEmployees > 0 ? Math.round((fullyCurrent / totalEmployees) * 100) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compliance Overview</CardTitle>
        <CardDescription>Organization-wide compliance status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Compliance</span>
            <span className="text-2xl font-bold">{compliantPercentage}%</span>
          </div>
          <Progress value={compliantPercentage} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">
            {fullyCurrent} of {totalEmployees} employees are fully compliant
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-md border border-green-200 dark:border-green-900">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-xs text-muted-foreground">Compliant</p>
              <p className="text-2xl font-bold text-green-600">{fullyCurrent}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-200 dark:border-amber-900">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-xs text-muted-foreground">Expiring Soon</p>
              <p className="text-2xl font-bold text-amber-600">{warningCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-md border border-red-200 dark:border-red-900">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-xs text-muted-foreground">Critical</p>
              <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
