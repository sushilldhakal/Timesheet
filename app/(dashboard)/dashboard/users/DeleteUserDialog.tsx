"use client"

import { useState } from "react"
import { ConfirmDialogShell } from "@/components/shared/forms"
import { useDeleteUser } from "@/lib/queries/users"
import type { User } from "@/lib/types/user"

type Props = {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function DeleteUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const [error, setError] = useState<string | null>(null)

  const deleteUserMutation = useDeleteUser()

  const handleDelete = async () => {
    setError(null)
    try {
      await deleteUserMutation.mutateAsync(user.id)
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error")
    }
  }

  const loading = deleteUserMutation.isPending

  return (
    <ConfirmDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Delete User"
      description={
        <>
          Are you sure you want to delete <strong>{user.name}</strong>?
          This action cannot be undone.
        </>
      }
      onConfirm={handleDelete}
      confirmLabel="Delete"
      loading={loading}
      error={error}
      variant="destructive"
    />
  )
}
