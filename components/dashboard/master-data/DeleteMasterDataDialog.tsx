"use client"

import { useState } from "react"
import { ConfirmDialogShell } from "@/components/shared/forms"
import { useDeleteLocation } from "@/lib/queries/locations"
import { useDeleteTeam } from "@/lib/queries/teams"
import { useDeleteEmployer } from "@/lib/queries/employers"
import { useDeleteTeamGroup } from "@/lib/queries/team-groups"
import type { CategoryRow } from "./types"

const TYPE_LABELS: Record<"team" | "teamGroup" | "employer" | "location", string> = {
  team: "Team",
  teamGroup: "Team Group",
  employer: "Employer",
  location: "Location",
}

type Props = {
  category: CategoryRow
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function DeleteMasterDataDialog({
  category,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const [error, setError] = useState<string | null>(null)

  const deleteLocationMutation = useDeleteLocation()
  const deleteTeamMutation = useDeleteTeam()
  const deleteEmployerMutation = useDeleteEmployer()
  const deleteTeamGroupMutation = useDeleteTeamGroup()

  const typeLabel = TYPE_LABELS[category.type]

  const handleDelete = async () => {
    setError(null)
    try {
      if (category.type === "location") await deleteLocationMutation.mutateAsync(category.id)
      else if (category.type === "team") await deleteTeamMutation.mutateAsync(category.id)
      else if (category.type === "teamGroup") await deleteTeamGroupMutation.mutateAsync(category.id)
      else await deleteEmployerMutation.mutateAsync(category.id)
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error")
    }
  }

  const loading =
    deleteLocationMutation.isPending ||
    deleteTeamMutation.isPending ||
    deleteTeamGroupMutation.isPending ||
    deleteEmployerMutation.isPending

  return (
    <ConfirmDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${typeLabel}`}
      description={
        <>
          Are you sure you want to delete <strong>{category.name}</strong>?
          This may affect employees assigned to this {typeLabel.toLowerCase()}.
        </>
      }
      onConfirm={handleDelete}
      confirmLabel={loading ? "Deleting..." : "Delete"}
      loading={loading}
      error={error}
      variant="destructive"
    />
  )
}
