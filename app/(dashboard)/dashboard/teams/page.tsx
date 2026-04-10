"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, UserCircle } from "lucide-react"
import { useTeams, useUpdateTeam } from "@/lib/queries/teams"
import { useTeamGroups } from "@/lib/queries/team-groups"
import { TeamsTable } from "@/components/dashboard/tables/TeamsTable"
import { AddMasterDataDialog } from "@/components/dashboard/master-data/AddMasterDataDialog"
import { EditMasterDataDialog } from "@/components/dashboard/master-data/EditMasterDataDialog"
import { DeleteMasterDataDialog } from "@/components/dashboard/master-data/DeleteMasterDataDialog"
import type { CategoryRow } from "@/components/dashboard/master-data/types"

export default function TeamsPage() {
  const [addOpen, setAddOpen] = useState(false)
  const [editRow, setEditRow] = useState<CategoryRow | null>(null)
  const [deleteRow, setDeleteRow] = useState<CategoryRow | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  const teamsQuery = useTeams({ listMode: true })
  const teamGroupsQuery = useTeamGroups()
  const updateTeamMutation = useUpdateTeam()

  const teamGroupsMap = useMemo(() => {
    const map = new Map<string, string>()
    ;(teamGroupsQuery.data?.teamGroups ?? []).forEach((g) => {
      map.set(g.id, g.name)
    })
    return map
  }, [teamGroupsQuery.data?.teamGroups])

  const rows: CategoryRow[] = useMemo(
    () => (teamsQuery.data?.teams ?? []).map((t) => ({
      ...t,
      type: "team" as const,
      teamGroup: t.groupId ? teamGroupsMap.get(t.groupId) : undefined,
    })),
    [teamsQuery.data?.teams, teamGroupsMap]
  )

  const total = rows.length
  const activeCount = rows.filter((r) => r.isActive !== false).length

  const inactiveRows = rows.filter((r) => r.isActive === false)
  const activeRows = rows.filter((r) => r.isActive !== false)

  const refetch = useCallback(() => {
    teamsQuery.refetch()
  }, [teamsQuery])

  const handleActivateAll = async () => {
    if (inactiveRows.length === 0) return
    if (!confirm(`Activate all ${inactiveRows.length} inactive team(s)?`)) return
    setBulkBusy(true)
    try {
      await Promise.all(
        inactiveRows.map((r) =>
          updateTeamMutation.mutateAsync({ id: r.id, data: { isActive: true } })
        )
      )
    } finally {
      setBulkBusy(false)
    }
  }

  const handleDeactivateAll = async () => {
    if (activeRows.length === 0) return
    if (!confirm(`Deactivate all ${activeRows.length} active team(s)?`)) return
    setBulkBusy(true)
    try {
      await Promise.all(
        activeRows.map((r) =>
          updateTeamMutation.mutateAsync({ id: r.id, data: { isActive: false } })
        )
      )
    } finally {
      setBulkBusy(false)
    }
  }

  const loading = !hydrated || teamsQuery.isLoading
  const errorMessage = (teamsQuery.error as Error | null)?.message

  return (
    <>
      <div className="flex flex-col space-y-4 p-4 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <UserCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
              <p className="text-sm text-muted-foreground">
                Job capacities you can assign to employees (e.g. Driver, Supervisor).
              </p>
            </div>
          </div>
          <Button onClick={() => setAddOpen(true)} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Add Team
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total teams</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">
                {hydrated ? total : "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active teams</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">
                {hydrated ? activeCount : "—"}
              </p>
            </CardContent>
          </Card>
          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Bulk actions</CardTitle>
              <CardDescription className="text-xs">Update active status for every team at once.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hydrated || bulkBusy || inactiveRows.length === 0}
                onClick={handleActivateAll}
              >
                Activate all
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hydrated || bulkBusy || activeRows.length === 0}
                onClick={handleDeactivateAll}
              >
                Deactivate all
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All teams</CardTitle>
            <CardDescription>Search, edit, or remove teams.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-muted-foreground">Loading...</p>
            ) : errorMessage ? (
              <p className="py-8 text-center text-destructive">{errorMessage}</p>
            ) : (
              <TeamsTable
                teams={rows}
                onEdit={(row) => {
                  const latest = rows.find((r) => r.id === row.id)
                  setEditRow(latest ?? row)
                }}
                onDelete={setDeleteRow}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <AddMasterDataDialog
        type="team"
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={() => {
          setAddOpen(false)
          refetch()
        }}
      />

      {editRow && (
        <EditMasterDataDialog
          key={editRow.id + (editRow.updatedAt ?? "")}
          category={editRow}
          open={!!editRow}
          onOpenChange={(open) => !open && setEditRow(null)}
          onSuccess={() => {
            setEditRow(null)
            refetch()
          }}
        />
      )}

      {deleteRow && (
        <DeleteMasterDataDialog
          category={deleteRow}
          open={!!deleteRow}
          onOpenChange={(open) => !open && setDeleteRow(null)}
          onSuccess={() => {
            setDeleteRow(null)
            refetch()
          }}
        />
      )}
    </>
  )
}
