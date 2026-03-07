"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
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
    try {
      await deleteEmployeeMutation.mutateAsync(employee.id)
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete")
    }
  }

  const loading = deleteEmployeeMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Delete Employee</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete <strong>{employee.name}</strong>? This action cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
