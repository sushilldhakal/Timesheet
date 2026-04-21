"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw, Award, Plus } from "lucide-react"
import { useEmployeeQualifications } from "@/lib/queries/employees"
import { deleteEmployeeQualification } from "@/lib/api/employees"
import { toast } from "sonner"
import { QualificationForm } from "@/components/employees/forms/QualificationForm"
import { QualificationCard } from "@/components/employees/qualifications/QualificationCard"
import { ProfileSectionCard } from "@/components/shared/profile"
import { FormDialogShell } from "@/components/shared/forms"
import type { EmployeeQualification } from "@/lib/api/employees"

interface QualificationsTabProps {
  employeeId: string
  canEdit?: boolean
  isStaffView?: boolean
}

function SectionSkeleton() {
  return (
    <ProfileSectionCard title="Loading qualifications...">
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </ProfileSectionCard>
  )
}

function statusIcon(qualification: EmployeeQualification): "green" | "amber" | "red" {
  if (qualification.status === "expired") return "red"
  if (qualification.status === "pending") return "amber"
  if (qualification.expiryDate) {
    const now = new Date()
    const expiry = new Date(qualification.expiryDate)
    const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntil < 0) return "red"
    if (daysUntil <= 30) return "amber"
  }
  return "green"
}

export function QualificationsTab({ employeeId, canEdit = false, isStaffView = false }: QualificationsTabProps) {
  const { data, isLoading, error, refetch } = useEmployeeQualifications(employeeId)
  const [isAddingQualification, setIsAddingQualification] = useState(false)
  const [editingQualificationId, setEditingQualificationId] = useState<string | null>(null)

  if (isLoading) return <SectionSkeleton />

  if (error) {
    return (
      <ProfileSectionCard 
        title="Error Loading Qualifications"
        icon={<AlertCircle className="h-4 w-4 text-destructive" />}
      >
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-3">Failed to load qualifications</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Retry
          </Button>
        </div>
      </ProfileSectionCard>
    )
  }

  const qualifications = data?.qualifications || []

  if (qualifications.length === 0) {
    return (
      <>
        <ProfileSectionCard 
          title={isStaffView ? "Your Qualifications" : "Qualifications & Certifications"}
          icon={<Award className="h-4 w-4 text-muted-foreground" />}
          actions={canEdit ? (
            <Button onClick={() => setIsAddingQualification(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Qualification
            </Button>
          ) : undefined}
        >
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Award className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No Qualifications</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isStaffView 
                ? "Add your certifications and qualifications to keep them up to date"
                : "No qualifications or certifications have been recorded for this employee yet."
              }
            </p>
          </div>
        </ProfileSectionCard>

        <FormDialogShell
          open={isAddingQualification}
          onOpenChange={(open) => {
            if (!open) setIsAddingQualification(false)
          }}
          title="Add Qualification"
          size="lg"
        >
          <QualificationForm
            employeeId={employeeId}
            onSuccess={() => {
              setIsAddingQualification(false)
              refetch()
            }}
            onCancel={() => setIsAddingQualification(false)}
          />
        </FormDialogShell>
      </>
    )
  }

  const expired = qualifications.filter(q => statusIcon(q) === "red")
  const expiring = qualifications.filter(q => statusIcon(q) === "amber")
  const current = qualifications.filter(q => statusIcon(q) === "green")

  const sortedQualifications = [...qualifications].sort(
    (a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
  )

  const editingQualification = editingQualificationId
    ? qualifications.find(q => q.id === editingQualificationId)
    : undefined

  const handleDelete = async (qualificationId: string) => {
    if (!confirm('Are you sure you want to delete this qualification?')) return
    try {
      await deleteEmployeeQualification(employeeId, qualificationId)
      toast.success('Qualification deleted successfully')
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete qualification')
    }
  }

  return (
    <div className="space-y-6">
      <ProfileSectionCard 
        title={isStaffView ? "Your Qualifications" : "Qualifications & Certifications"}
        icon={<Award className="h-4 w-4 text-muted-foreground" />}
        actions={canEdit ? (
          <Button onClick={() => setIsAddingQualification(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Qualification
          </Button>
        ) : undefined}
      >
        {/* Summary */}
        <div className="flex items-center gap-3 mb-4">
          <Badge variant="secondary" className="text-xs">
            {qualifications.length} Total
          </Badge>
          {current.length > 0 && (
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-xs">
              {current.length} Current
            </Badge>
          )}
          {expiring.length > 0 && (
            <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 text-xs">
              {expiring.length} Expiring
            </Badge>
          )}
          {expired.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {expired.length} Expired
            </Badge>
          )}
        </div>

        {/* Qualifications List */}
        <div className="space-y-4">
          {sortedQualifications.map((qual) => (
            <QualificationCard
              key={qual.id}
              qualification={qual}
              canEdit={canEdit}
              onEdit={() => setEditingQualificationId(qual.id)}
              onDelete={() => handleDelete(qual.id)}
            />
          ))}
        </div>
      </ProfileSectionCard>

      {/* Add/Edit Qualification Dialog */}
      <FormDialogShell
        open={isAddingQualification || !!editingQualificationId}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddingQualification(false)
            setEditingQualificationId(null)
          }
        }}
        title={isAddingQualification ? 'Add Qualification' : 'Edit Qualification'}
        size="lg"
      >
        <QualificationForm
          employeeId={employeeId}
          isEditing={!!editingQualificationId}
          initialData={editingQualification}
          onSuccess={() => {
            setIsAddingQualification(false)
            setEditingQualificationId(null)
            refetch()
          }}
          onCancel={() => {
            setIsAddingQualification(false)
            setEditingQualificationId(null)
          }}
        />
      </FormDialogShell>
    </div>
  )
}