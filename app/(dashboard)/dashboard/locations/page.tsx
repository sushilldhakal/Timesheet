"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useQueries } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin } from "lucide-react"
import { useLocations, locationKeys } from "@/lib/queries/locations"
import * as locationsApi from "@/lib/api/locations"
import { LocationsTable } from "@/components/dashboard/tables/LocationsTable"
import { AddMasterDataDialog } from "@/components/dashboard/master-data/AddMasterDataDialog"
import { EditMasterDataDialog } from "@/components/dashboard/master-data/EditMasterDataDialog"
import { DeleteMasterDataDialog } from "@/components/dashboard/master-data/DeleteMasterDataDialog"
import { TablePageToolbar, InfoGrid, InfoCard } from "@/components/shared"
import type { CategoryRow } from "@/components/dashboard/master-data/types"

export default function LocationsPage() {
  const [addOpen, setAddOpen] = useState(false)
  const [editRow, setEditRow] = useState<CategoryRow | null>(null)
  const [deleteRow, setDeleteRow] = useState<CategoryRow | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  const locationsQuery = useLocations({ listMode: true })
  const locations = locationsQuery.data?.locations ?? []

  const teamCountQueries = useQueries({
    queries: locations.map((loc) => ({
      queryKey: locationKeys.teams(loc.id),
      queryFn: () => locationsApi.getLocationTeams(loc.id),
      enabled: locations.length > 0,
      staleTime: 60 * 1000,
    })),
  })

  const teamsAssignedByLocationId = useMemo(() => {
    const m: Record<string, number> = {}
    locations.forEach((loc, i) => {
      const q = teamCountQueries[i]
      if (!q || q.isPending) return
      m[loc.id] = q.data?.teams?.length ?? 0
    })
    return m
  }, [locations, teamCountQueries])

  const teamsByLocationId = useMemo(() => {
    const m: Record<string, locationsApi.LocationTeam[] | undefined> = {}
    locations.forEach((loc, i) => {
      const q = teamCountQueries[i]
      if (!q) return
      if (q.isPending) {
        m[loc.id] = undefined
        return
      }
      m[loc.id] = q.data?.teams ?? []
    })
    return m
  }, [locations, teamCountQueries])

  const rows: CategoryRow[] = useMemo(
    () => locations.map((l) => ({ ...l, type: "location" as const })),
    [locations]
  )

  const total = rows.length
  const geofenceEnabled = rows.filter(
    (r) => r.lat != null && r.lng != null && (r.radius ?? 0) > 0
  ).length

  const refetch = useCallback(() => {
    locationsQuery.refetch()
  }, [locationsQuery])

  const loading = !hydrated || locationsQuery.isLoading
  const errorMessage = (locationsQuery.error as Error | null)?.message

  return (
    <>
      <div className="flex flex-col space-y-6 p-4 lg:p-8">
        {/* Page Toolbar */}
        <TablePageToolbar
          title="Locations"
          description="Sites and offices with optional geofencing for clock-in."
          onAdd={() => setAddOpen(true)}
          addLabel="Add Location"
          onRefresh={refetch}
          loading={loading}
        />

        {/* Metrics Grid */}
        <InfoGrid columns={2}>
          <InfoCard title="Total locations">
            <div className="text-2xl font-bold tabular-nums">
              {hydrated ? total : "—"}
            </div>
          </InfoCard>
          
          <InfoCard title="With geofencing set">
            <div className="text-2xl font-bold tabular-nums">
              {hydrated ? geofenceEnabled : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Has coordinates and a non-zero radius
            </p>
          </InfoCard>
        </InfoGrid>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>All locations</CardTitle>
            <CardDescription>Coordinates, radius, hours, and team assignments.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-muted-foreground">Loading...</p>
            ) : errorMessage ? (
              <p className="py-8 text-center text-destructive">{errorMessage}</p>
            ) : (
              <LocationsTable
                locations={rows}
                teamsAssignedByLocationId={teamsAssignedByLocationId}
                teamsByLocationId={teamsByLocationId}
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
        type="location"
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
