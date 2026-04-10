"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useDeleteLocation } from "@/lib/queries/locations"
import { useDeleteRole } from "@/lib/queries/roles"
import { useDeleteEmployer } from "@/lib/queries/employers"
import type { CategoryRow } from "./page"

const TYPE_LABELS: Record<"role" | "employer" | "location", string> = {
  role: "Role",
  employer: "Employer",
  location: "Location",
}

type Props = {
  category: CategoryRow
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function DeleteCategoryDialog({
  category,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const [error, setError] = useState<string | null>(null)

  const deleteLocationMutation = useDeleteLocation()
  const deleteRoleMutation = useDeleteRole()
  const deleteEmployerMutation = useDeleteEmployer()

  const typeLabel = TYPE_LABELS[category.type]

  const handleDelete = async () => {
    setError(null)
    try {
      if (category.type === "location") await deleteLocationMutation.mutateAsync(category.id)
      else if (category.type === "role") await deleteRoleMutation.mutateAsync(category.id)
      else await deleteEmployerMutation.mutateAsync(category.id)
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error")
    }
  }

  const loading = deleteLocationMutation.isPending || deleteRoleMutation.isPending || deleteEmployerMutation.isPending

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {typeLabel}</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{category.name}</strong>?
            This may affect employees assigned to this {typeLabel.toLowerCase()}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p className="text-destructive text-sm">{error}</p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
