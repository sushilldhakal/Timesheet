"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertCircle, RefreshCw, Edit2 } from "lucide-react"
import { useEmployeeCompliance } from "@/lib/queries/employees"
import { ComplianceForm } from "@/components/employees/forms/ComplianceForm"
import { ComplianceAlertBanner } from "@/components/employees/compliance/ComplianceAlertBanner"
import { ComplianceStatusTable } from "@/components/employees/compliance/ComplianceStatusTable"

interface ComplianceTabProps {
  employeeId: string
  canEditPayroll?: boolean
}

function SectionSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

export function ComplianceTab({ employeeId, canEditPayroll = false }: ComplianceTabProps) {
  const { data, isLoading, error, refetch } = useEmployeeCompliance(employeeId)
  const [isEditingCompliance, setIsEditingCompliance] = useState(false)

  if (isLoading) return <SectionSkeleton />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground mb-3">Failed to load compliance data</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Retry
        </Button>
      </div>
    )
  }

  const compliance = data?.compliance
  if (!compliance) return null

  return (
    <div className="space-y-6">
      <ComplianceAlertBanner compliance={compliance} />

      <ComplianceStatusTable compliance={compliance} />

      {/* Health & Safety Certifications (standalone section kept from original) */}
      {compliance.healthSafetyCertifications && compliance.healthSafetyCertifications.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Health & Safety Certifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {compliance.healthSafetyCertifications.map((cert) => (
                <Badge key={cert} variant="secondary">{cert}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {canEditPayroll && (
        <Button onClick={() => setIsEditingCompliance(true)} variant="outline">
          <Edit2 className="mr-2 h-4 w-4" />
          Edit Compliance Information
        </Button>
      )}

      {compliance.lastComplianceCheckDate && (
        <p className="text-xs text-muted-foreground text-right">
          Last compliance check: {new Date(compliance.lastComplianceCheckDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      )}

      <Dialog open={isEditingCompliance} onOpenChange={setIsEditingCompliance}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Compliance Information</DialogTitle>
          </DialogHeader>
          <ComplianceForm
            employeeId={employeeId}
            initialData={compliance}
            onSuccess={() => {
              setIsEditingCompliance(false)
              refetch()
            }}
            onCancel={() => setIsEditingCompliance(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
