'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Loader2 } from 'lucide-react'
import { QualificationForm } from '@/components/employees/forms/QualificationForm'
import { QualificationCard } from '@/components/employees/qualifications/QualificationCard'
import { getEmployeeQualifications, deleteEmployeeQualification } from '@/lib/api/employees'
import { toast } from 'sonner'

interface StaffQualificationsTabProps {
  employeeId: string
}

export function StaffQualificationsTab({ employeeId }: StaffQualificationsTabProps) {
  const [isAddingQualification, setIsAddingQualification] = useState(false)
  const [editingQualificationId, setEditingQualificationId] = useState<string | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['employeeQualifications', employeeId],
    queryFn: () => getEmployeeQualifications(employeeId),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const qualifications = data?.qualifications ?? []

  const handleDelete = async (qualificationId: string) => {
    if (!confirm('Are you sure you want to delete this qualification?')) return
    try {
      await deleteEmployeeQualification(employeeId, qualificationId)
      toast.success('Qualification deleted successfully')
      refetch()
    } catch {
      toast.error('Failed to delete qualification')
    }
  }

  const editingQualification = editingQualificationId
    ? qualifications.find(q => q.id === editingQualificationId)
    : undefined

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setIsAddingQualification(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Qualification
        </Button>
      </div>

      {qualifications.length > 0 ? (
        <div className="space-y-4">
          {[...qualifications]
            .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
            .map((qual) => (
              <QualificationCard
                key={qual.id}
                qualification={qual}
                canEdit
                onEdit={() => setEditingQualificationId(qual.id)}
                onDelete={() => handleDelete(qual.id)}
              />
            ))}
        </div>
      ) : (
        <div className="rounded-md bg-muted/50 p-8 text-center border border-dashed">
          <p className="font-medium text-muted-foreground">No qualifications added yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add your certifications and qualifications to keep them up to date</p>
        </div>
      )}

      <Dialog open={isAddingQualification || !!editingQualificationId} onOpenChange={(open) => {
        if (!open) {
          setIsAddingQualification(false)
          setEditingQualificationId(null)
        }
      }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isAddingQualification ? 'Add Qualification' : 'Edit Qualification'}
            </DialogTitle>
          </DialogHeader>
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
        </DialogContent>
      </Dialog>
    </div>
  )
}
