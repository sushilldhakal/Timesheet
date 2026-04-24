"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Briefcase } from "lucide-react"
import { useEmployers, useEmployerSettings } from "@/lib/queries/employers"
import { useAwards } from "@/lib/queries/awards"
import { EmployersTable } from "@/components/dashboard/tables/EmployersTable"
import { AddMasterDataDialog } from "@/components/dashboard/master-data/AddMasterDataDialog"
import { EditMasterDataDialog } from "@/components/dashboard/master-data/EditMasterDataDialog"
import { DeleteMasterDataDialog } from "@/components/dashboard/master-data/DeleteMasterDataDialog"
import { TablePageToolbar, InfoGrid, InfoCard } from "@/components/shared"
import type { CategoryRow } from "@/components/dashboard/master-data/types"

export default function EmployersPage() {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [editRow, setEditRow] = useState<CategoryRow | null>(null)
  const [deleteRow, setDeleteRow] = useState<CategoryRow | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  const { data: employerSettings, isLoading: settingsLoading } = useEmployerSettings()
  const enableExternalHire = employerSettings?.enableExternalHire ?? false

  // Redirect away if external hire is disabled (once settings have loaded)
  useEffect(() => {
    if (!settingsLoading && employerSettings && !enableExternalHire) {
      router.replace("/dashboard")
    }
  }, [settingsLoading, employerSettings, enableExternalHire, router])

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

  // Don't render until settings are confirmed
  if (settingsLoading || !enableExternalHire) return null

  return (
    <>
      <div className="flex flex-col space-y-6 p-4 lg:p-8">
        {/* Page Toolbar */}
        <TablePageToolbar
          title="Employers"
          description="Companies and payroll entities you can assign to staff."
          onAdd={() => setAddOpen(true)}
          addLabel="Add Employer"
          onRefresh={refetch}
          loading={loading}
        />

        {/* Metrics Grid */}
        <InfoGrid columns={2}>
          <InfoCard title="Total employers">
            <div className="text-2xl font-bold tabular-nums">
              {hydrated ? total : "—"}
            </div>
          </InfoCard>
          
          <InfoCard title="With default award">
            <div className="text-2xl font-bold tabular-nums">
              {hydrated ? withAward : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Have a default award configured
            </p>
          </InfoCard>
        </InfoGrid>

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
