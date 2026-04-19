"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, UserCircle } from "lucide-react"
import { useTeams, useUpdateTeam } from "@/lib/queries/teams"
import { useTeamGroups } from "@/lib/queries/team-groups"
import { TeamsTable } from "@/components/dashboard/tables/TeamsTable"
import { TeamGroupsTable } from "@/components/dashboard/tables/TeamGroupsTable"
import { AddMasterDataDialog } from "@/components/dashboard/master-data/AddMasterDataDialog"
import { EditMasterDataDialog } from "@/components/dashboard/master-data/EditMasterDataDialog"
import { DeleteMasterDataDialog } from "@/components/dashboard/master-data/DeleteMasterDataDialog"
import { TablePageToolbar, InfoGrid, InfoCard } from "@/components/shared"
import type { CategoryRow } from "@/components/dashboard/master-data/types"

export default function TeamsPage() {
  const [addOpen, setAddOpen] = useState(false)
  const [addTeamGroupOpen, setAddTeamGroupOpen] = useState(false)
  const [editRow, setEditRow] = useState<CategoryRow | null>(null)
  const [deleteRow, setDeleteRow] = useState<CategoryRow | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [selectedRows, setSelectedRows] = useState<CategoryRow[]>([])

  useEffect(() => {
    setHydrated(true)
  }, [])

  const teamsQuery = useTeams({ listMode: true })
  const teamGroupsQuery = useTeamGroups({ listMode: true })
  const updateTeamMutation = useUpdateTeam()

  const rows: CategoryRow[] = useMemo(
    () => (teamsQuery.data?.teams ?? []).map((t) => ({
      ...t,
      type: "team" as const,
      // Backend is source of truth for Team → TeamGroup join.
      teamGroup: t.groupName ?? t.groupSnapshot?.name ?? undefined,
    })),
    [teamsQuery.data?.teams]
  )

  const teamGroupRows: CategoryRow[] = useMemo(
    () =>
      (teamGroupsQuery.data?.teamGroups ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        color: g.color,
        order: g.order,
        isActive: g.isActive,
        type: "teamGroup" as const,
        createdAt: g.createdAt ?? undefined,
        updatedAt: g.updatedAt ?? undefined,
      })),
    [teamGroupsQuery.data?.teamGroups]
  )

  const total = rows.length
  const activeCount = rows.filter((r) => r.isActive !== false).length

  const refetch = useCallback(() => {
    teamsQuery.refetch()
    teamGroupsQuery.refetch()
  }, [teamsQuery, teamGroupsQuery])

  const handleActivateSelected = async () => {
    const toActivate = selectedRows.filter((r) => r.isActive === false)
    if (toActivate.length === 0) return
    setBulkBusy(true)
    try {
      await Promise.all(
        toActivate.map((r) =>
          updateTeamMutation.mutateAsync({ id: r.id, data: { isActive: true } })
        )
      )
    } finally {
      setBulkBusy(false)
    }
  }

  const handleDeactivateSelected = async () => {
    const toDeactivate = selectedRows.filter((r) => r.isActive !== false)
    if (toDeactivate.length === 0) return
    setBulkBusy(true)
    try {
      await Promise.all(
        toDeactivate.map((r) =>
          updateTeamMutation.mutateAsync({ id: r.id, data: { isActive: false } })
        )
      )
    } finally {
      setBulkBusy(false)
    }
  }

  const handleReorder = useCallback(
    async (teamId: string, newOrder: number) => {
      try {
        await updateTeamMutation.mutateAsync({ id: teamId, data: { order: newOrder } })
      } catch (error) {
        console.error("Failed to update team order:", error)
        // Refetch to revert to server state
        refetch()
        throw error
      }
    },
    [updateTeamMutation, refetch]
  )

  const loading = !hydrated || teamsQuery.isLoading
  const errorMessage = (teamsQuery.error as Error | null)?.message

  return (
    <>
      <div className="flex flex-col space-y-6 p-4 lg:p-8">
        {/* Page Toolbar */}
        <TablePageToolbar
          title="Teams"
          description="Job capacities you can assign to employees (e.g. Driver, Supervisor)."
          onAdd={() => setAddOpen(true)}
          addLabel="Add Team"
          onRefresh={refetch}
          loading={loading}
          actions={
            <Button variant="outline" onClick={() => setAddTeamGroupOpen(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Team Group
            </Button>
          }
        />

        {/* Metrics Grid */}
        <InfoGrid columns={3}>
          <InfoCard title="Total teams">
            <div className="text-2xl font-bold tabular-nums">
              {hydrated ? total : "—"}
            </div>
          </InfoCard>
          
          <InfoCard title="Active teams">
            <div className="text-2xl font-bold tabular-nums">
              {hydrated ? activeCount : "—"}
            </div>
          </InfoCard>
          
          <InfoCard 
            title="Bulk actions"
            description="Select rows in the table, then activate or deactivate them."
          >
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hydrated || bulkBusy || selectedRows.length === 0}
                onClick={handleActivateSelected}
              >
                Activate selected
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hydrated || bulkBusy || selectedRows.length === 0}
                onClick={handleDeactivateSelected}
              >
                Deactivate selected
              </Button>
            </div>
          </InfoCard>
        </InfoGrid>

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
                onToggleActive={async (row) => {
                  await updateTeamMutation.mutateAsync({ id: row.id, data: { isActive: row.isActive === false } })
                  refetch()
                }}
                onSelectionChange={setSelectedRows}
                onReorder={handleReorder}
                enableDragReorder={true}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team groups</CardTitle>
            <CardDescription>Create and manage the team groups used to organize teams.</CardDescription>
          </CardHeader>
          <CardContent>
            {!hydrated || teamGroupsQuery.isLoading ? (
              <p className="py-8 text-center text-muted-foreground">Loading...</p>
            ) : (teamGroupsQuery.error as Error | null)?.message ? (
              <p className="py-8 text-center text-destructive">
                {((teamGroupsQuery.error as Error | null) ?? new Error("Failed to load team groups")).message}
              </p>
            ) : (
              <TeamGroupsTable
                teamGroups={teamGroupRows}
                onEdit={(row) => setEditRow(row)}
                onDelete={(row) => setDeleteRow(row)}
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
      <AddMasterDataDialog
        type="teamGroup"
        open={addTeamGroupOpen}
        onOpenChange={setAddTeamGroupOpen}
        onSuccess={() => {
          setAddTeamGroupOpen(false)
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
