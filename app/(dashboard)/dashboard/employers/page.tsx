"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Briefcase } from "lucide-react"
import { useEmployers } from "@/lib/queries/employers"
import { useAwards } from "@/lib/queries/awards"
import { EmployersTable } from "@/components/dashboard/tables/EmployersTable"
import { AddMasterDataDialog } from "@/components/dashboard/master-data/AddMasterDataDialog"
import { EditMasterDataDialog } from "@/components/dashboard/master-data/EditMasterDataDialog"
import { DeleteMasterDataDialog } from "@/components/dashboard/master-data/DeleteMasterDataDialog"
import type { CategoryRow } from "@/components/dashboard/master-data/types"

export default function EmployersPage() {
  const [addOpen, setAddOpen] = useState(false)
  const [editRow, setEditRow] = useState<CategoryRow | null>(null)
  const [deleteRow, setDeleteRow] = useState<CategoryRow | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  const employersQuery = useEmployers({ listMode: true })
  const awardsQuery = useAwards()

  const rows: CategoryRow[] = useMemo(
    () => (employersQuery.data?.employers ?? []).map((e) => ({ ...e, type: "employer" as const })),
    [employersQuery.data?.employers]
  )

  const awardNameById = useMemo(() => {
    const m: Record<string, string> = {}
    for (const a of awardsQuery.data?.awards ?? []) {
      m[a._id] = a.name
    }
    return m
  }, [awardsQuery.data?.awards])

  const total = rows.length
  const withAward = rows.filter((r) => !!r.defaultAwardId).length

  const refetch = useCallback(() => {
    employersQuery.refetch()
  }, [employersQuery])

  const loading = !hydrated || employersQuery.isLoading || awardsQuery.isLoading
  const errorMessage = (employersQuery.error as Error | null)?.message

  return (
    <>
      <div className="flex flex-col space-y-4 p-4 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Employers</h1>
              <p className="text-sm text-muted-foreground">
                Companies and payroll entities you can assign to staff.
              </p>
            </div>
          </div>
          <Button onClick={() => setAddOpen(true)} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Add Employer
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total employers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">
                {hydrated ? total : "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">With award assigned</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">
                {hydrated ? withAward : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All employers</CardTitle>
            <CardDescription>ABN, contact email, and default award.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-muted-foreground">Loading...</p>
            ) : errorMessage ? (
              <p className="py-8 text-center text-destructive">{errorMessage}</p>
            ) : (
              <EmployersTable
                employers={rows}
                awardNameById={awardNameById}
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
        type="employer"
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
