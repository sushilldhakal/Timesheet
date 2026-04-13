'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { ComplianceBreakdown } from '@/lib/utils/compliance-dashboard'

interface ComplianceBreakdownCardProps {
  breakdown: ComplianceBreakdown
}

function ComplianceItem({ label, compliant, warning, critical }: { label: string; compliant: number; warning: number; critical: number }) {
  const total = compliant + warning + critical
  const compliantPercentage = total > 0 ? Math.round((compliant / total) * 100) : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">{compliantPercentage}% compliant</span>
      </div>
      <Progress value={compliantPercentage} className="h-2" />
      <div className="flex gap-2 text-xs">
        <span className="text-green-600">{compliant} compliant</span>
        <span className="text-amber-600">{warning} warning</span>
        <span className="text-red-600">{critical} critical</span>
      </div>
    </div>
  )
}

export function ComplianceBreakdownCard({ breakdown }: ComplianceBreakdownCardProps) {
  const inductionTotal = breakdown.induction.completed + breakdown.induction.pending
  const inductionPct = inductionTotal > 0 ? Math.round((breakdown.induction.completed / inductionTotal) * 100) : 0

  const cocTotal = breakdown.codeOfConduct.signed + breakdown.codeOfConduct.pending
  const cocPct = cocTotal > 0 ? Math.round((breakdown.codeOfConduct.signed / cocTotal) * 100) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Compliance by Type</CardTitle>
        <CardDescription>Status breakdown for each compliance requirement</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ComplianceItem label="Working With Children Check" compliant={breakdown.wwc.compliant} warning={breakdown.wwc.warning} critical={breakdown.wwc.critical} />
        <ComplianceItem label="Police Clearance" compliant={breakdown.policeClearance.compliant} warning={breakdown.policeClearance.warning} critical={breakdown.policeClearance.critical} />
        <ComplianceItem label="Food Handling Certification" compliant={breakdown.foodHandling.compliant} warning={breakdown.foodHandling.warning} critical={breakdown.foodHandling.critical} />

        <div className="pt-4 border-t space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Induction Completed</span>
              <span className="text-sm font-semibold">{breakdown.induction.completed} / {inductionTotal}</span>
            </div>
            <Progress value={inductionPct} className="h-2" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Code of Conduct Signed</span>
              <span className="text-sm font-semibold">{breakdown.codeOfConduct.signed} / {cocTotal}</span>
            </div>
            <Progress value={cocPct} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
