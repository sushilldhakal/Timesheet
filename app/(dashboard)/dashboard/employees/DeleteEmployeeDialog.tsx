"use client"

import { ConfirmDialogShell } from "@/components/shared/forms"
import { useDeleteEmployee } from "@/lib/queries/employees"
import type { Employee } from "@/lib/api/employees"

type EmployeeRow = Employee

type Props = {
  employee: EmployeeRow
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function DeleteEmployeeDialog({ employee, open, onOpenChange, onSuccess }: Props) {
  const deleteEmployeeMutation = useDeleteEmployee()

  const handleDelete = async () => {
    await deleteEmployeeMutation.mutateAsync(employee.id)
    onOpenChange(false)
    onSuccess()
  }

  const loading = deleteEmployeeMutation.isPending

  return (
    <ConfirmDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Employee"
      description={
        <>
          Are you sure you want to delete <strong>{employee.name}</strong>? This action cannot be undone.
        </>
      }
      onConfirm={handleDelete}
      confirmLabel="Delete"
      loading={loading}
      variant="destructive"
    />
  )
}
