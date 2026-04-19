"use client"

import { useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DataTable } from "@/components/ui/data-table/data-table"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
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
import { ConfirmDialogShell } from "@/components/shared/forms"
import { CalendarDays, Loader2, Plus, Trash2 } from "lucide-react"
import {
  getPublicHolidays,
  createPublicHoliday,
  deletePublicHoliday,
  seedPublicHolidays,
  type PublicHoliday,
} from "@/lib/api/public-holidays"

const STATE_OPTIONS = ['NAT', 'VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'] as const
type StateOption = (typeof STATE_OPTIONS)[number]

function formatHolidayDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StateBadge({ state }: { state: string }) {
  const variant =
    state === 'NAT'
      ? 'default'
      : state === 'VIC'
        ? 'secondary'
        : 'outline'

  const className =
    state === 'NAT'
      ? 'bg-blue-600 text-white hover:bg-blue-600'
      : state === 'VIC'
        ? 'bg-slate-900 text-white hover:bg-slate-900'
        : 'text-muted-foreground'

  return (
    <Badge variant={variant as any} className={className}>
      {state}
    </Badge>
  )
}

export default function PublicHolidaysPage() {
  const currentYear = new Date().getFullYear()
  const yearOptions = useMemo(() => {
    const years: number[] = []
    for (let y = currentYear - 2; y <= currentYear + 2; y++) years.push(y)
    return years
  }, [currentYear])

  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [selectedState, setSelectedState] = useState<string>('All')
  const [publicHolidays, setPublicHolidays] = useState<PublicHoliday[]>([])
  const [loading, setLoading] = useState(false)

  const [seedLoading, setSeedLoading] = useState(false)
  const [seedMessage, setSeedMessage] = useState<string | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createDate, setCreateDate] = useState("")
  const [createName, setCreateName] = useState("")
  const [createState, setCreateState] = useState<StateOption>('VIC')
  const [createRecurring, setCreateRecurring] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<PublicHoliday | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchHolidays = async () => {
    setLoading(true)
    setSeedMessage(null)
    try {
      const data = await getPublicHolidays({ year: selectedYear, state: selectedState })
      setPublicHolidays(data.publicHolidays ?? [])
    } catch {
      setPublicHolidays([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHolidays()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedState])

  const columns = useMemo<ColumnDef<PublicHoliday>[]>(
    () => [
      {
        accessorKey: "date",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        cell: ({ row }) => <span className="font-medium">{formatHolidayDate(row.original.date)}</span>,
      },
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => row.original.name,
      },
      {
        accessorKey: "state",
        header: ({ column }) => <DataTableColumnHeader column={column} title="State" />,
        cell: ({ row }) => <StateBadge state={row.original.state} />,
      },
      {
        accessorKey: "isRecurring",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Recurring" />,
        cell: ({ row }) => (row.original.isRecurring ? "Yes" : "No"),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end" onClick={(ev) => ev.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        ),
      },
    ],
    []
  )

  const handleSeed = async () => {
    setSeedLoading(true)
    setSeedMessage(null)
    try {
      const data = await seedPublicHolidays(selectedYear)
      setSeedMessage(`Seeded ${data?.upserted ?? 0} new holidays for ${selectedYear}`)
      await fetchHolidays()
    } catch (e: any) {
      setSeedMessage(e?.message || "Failed to seed holidays")
    } finally {
      setSeedLoading(false)
    }
  }

  const handleCreate = async () => {
    setCreateLoading(true)
    try {
      await createPublicHoliday({
        date: createDate,
        name: createName,
        state: createState,
        isRecurring: createRecurring,
      })
      setAddOpen(false)
      setCreateDate("")
      setCreateName("")
      setCreateState('VIC')
      setCreateRecurring(false)
      await fetchHolidays()
    } catch (e: any) {
      setSeedMessage(e?.message || "Failed to create holiday")
    } finally {
      setCreateLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await deletePublicHoliday(deleteTarget._id)
      setDeleteTarget(null)
      await fetchHolidays()
    } catch (e: any) {
      setSeedMessage(e?.message || "Failed to delete holiday")
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Public Holidays</h1>
          <p className="text-muted-foreground">
            Manage Australian public holidays used for penalty rate calculations
          </p>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Holiday
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Public Holiday</DialogTitle>
              <DialogDescription>
                Create a public holiday entry that can be used by penalty rate calculations.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Date</label>
                <input
                  type="date"
                  value={createDate}
                  onChange={(e) => setCreateDate(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Name</label>
                <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Christmas Day" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">State</label>
                <select
                  value={createState}
                  onChange={(e) => setCreateState(e.target.value as StateOption)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {STATE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={createRecurring}
                  onCheckedChange={(v) => setCreateRecurring(v === true)}
                  id="recurring"
                />
                <label htmlFor="recurring" className="text-sm">
                  Fixed date each year
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={createLoading || !createDate || !createName.trim()}
              >
                {createLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-none ring-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Holidays
          </CardTitle>
          <CardDescription>
            Filter by year and state, seed the minimum holiday set, and delete entries as needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Year</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">State</span>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="All">All</option>
                  {STATE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <Button onClick={handleSeed} variant="secondary" disabled={seedLoading}>
                {seedLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Seed Year
              </Button>
            </div>

            {seedMessage ? (
              <div className="text-sm text-muted-foreground">
                {seedMessage}
              </div>
            ) : null}
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : null}

          <DataTable
            columns={columns}
            data={publicHolidays}
            emptyMessage="No public holidays found for this filter."
            initialPageSize={25}
          />
        </CardContent>
      </Card>

      <ConfirmDialogShell
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete public holiday?"
        description={
          deleteTarget ? (
            <>
              This will permanently delete{" "}
              <span className="font-medium">{deleteTarget.name}</span>{" "}
              ({formatHolidayDate(deleteTarget.date)}). This action cannot be undone.
            </>
          ) : (
            "This action cannot be undone."
          )
        }
        onConfirm={handleDelete}
        confirmLabel="Delete"
        loading={deleteLoading}
        variant="destructive"
      />
    </div>
  )
}

