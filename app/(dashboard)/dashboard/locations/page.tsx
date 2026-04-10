"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useQueries } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, MapPin } from "lucide-react"
import { useLocations, locationKeys } from "@/lib/queries/locations"
import * as locationsApi from "@/lib/api/locations"
import { LocationsTable } from "@/components/dashboard/tables/LocationsTable"
import { AddMasterDataDialog } from "@/components/dashboard/master-data/AddMasterDataDialog"
import { EditMasterDataDialog } from "@/components/dashboard/master-data/EditMasterDataDialog"
import { DeleteMasterDataDialog } from "@/components/dashboard/master-data/DeleteMasterDataDialog"
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
      <div className="flex flex-col space-y-4 p-4 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Locations</h1>
              <p className="text-sm text-muted-foreground">
                Sites and offices with optional geofencing for clock-in.
              </p>
            </div>
          </div>
          <Button onClick={() => setAddOpen(true)} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Add Location
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total locations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">
                {hydrated ? total : "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">With geofencing set</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">
                {hydrated ? geofenceEnabled : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Has coordinates and a non-zero radius</p>
            </CardContent>
          </Card>
        </div>

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
