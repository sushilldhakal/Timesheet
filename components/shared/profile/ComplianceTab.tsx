"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertCircle, RefreshCw, Edit2 } from "lucide-react"
import { useEmployeeCompliance } from "@/lib/queries/employees"
import { ComplianceForm } from "@/components/employees/forms/ComplianceForm"
import { ComplianceAlertBanner } from "@/components/employees/compliance/ComplianceAlertBanner"
import { ComplianceStatusTable } from "@/components/employees/compliance/ComplianceStatusTable"
import { ProfileSectionCard } from "@/components/shared/profile"

interface ComplianceTabProps {
  employeeId: string
  canEditPayroll?: boolean
  isStaffView?: boolean
}

function SectionSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

export function ComplianceTab({ employeeId, canEditPayroll = false, isStaffView = false }: ComplianceTabProps) {
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
  
  if (!compliance) {
    return (
      <div className="rounded-md bg-muted/50 p-8 text-center border border-dashed">
        <p className="font-medium text-muted-foreground">No compliance data available</p>
        <p className="text-sm text-muted-foreground mt-1">
          {isStaffView ? "Contact HR to set up your compliance records" : "Compliance records have not been set up for this employee"}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ComplianceAlertBanner compliance={compliance} />

      <ComplianceStatusTable compliance={compliance} />

      {/* Health & Safety Certifications */}
      {compliance.healthSafetyCertifications && compliance.healthSafetyCertifications.length > 0 && (
        <ProfileSectionCard title="Health & Safety Certifications">
          <div className="flex flex-wrap gap-1.5">
            {compliance.healthSafetyCertifications.map((cert) => (
              <Badge key={cert} variant="secondary">{cert}</Badge>
            ))}
          </div>
        </ProfileSectionCard>
      )}

      {canEditPayroll && !isStaffView && (
        <Button onClick={() => setIsEditingCompliance(true)} variant="outline">
          <Edit2 className="mr-2 h-4 w-4" />
          Edit Compliance Information
        </Button>
      )}

      {compliance.lastComplianceCheckDate && (
        <p className="text-xs text-muted-foreground text-right">
          Last compliance check: {new Date(compliance.lastComplianceCheckDate).toLocaleDateString("en-AU", { 
            day: "numeric", 
            month: "short", 
            year: "numeric" 
          })}
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