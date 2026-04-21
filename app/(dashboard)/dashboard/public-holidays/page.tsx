"use client"

import { useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DataTable } from "@/components/ui/data-table/data-table"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import { FormDialogShell } from "@/components/shared/forms/FormDialogShell"
import { Checkbox } from "@/components/ui/checkbox"
import { ConfirmDialogShell } from "@/components/shared/forms"
import { InfoGrid, InfoCard, TableEmptyState } from "@/components/shared"
import { CalendarPageShell } from "@/components/dashboard/calendar/CalendarPageShell"
import { UnifiedCalendarTopbar } from "@/components/dashboard/calendar/UnifiedCalendarTopbar"
import { PublicHolidayYearNavigator } from "@/components/dashboard/public-holidays/PublicHolidayYearNavigator"
import { CalendarDays, Loader2, Plus, Trash2, Sparkles, MapPin } from "lucide-react"
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
  if (state === 'NAT') {
    return (
      <Badge className="bg-primary text-primary-foreground hover:bg-primary/90">
        {state}
      </Badge>
    )
  }
  
  return (
    <Badge variant="outline" className="text-muted-foreground">
      {state}
    </Badge>
  )
}

function RecurringBadge({ isRecurring }: { isRecurring: boolean }) {
  if (isRecurring) {
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
        Recurring
      </Badge>
    )
  }
  
  return (
    <Badge variant="outline" className="text-muted-foreground">
      One-off
    </Badge>
  )
}

export default function PublicHolidaysPage() {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [selectedState, setSelectedState] = useState<string>('All')
  const [publicHolidays, setPublicHolidays] = useState<PublicHoliday[]>([])
  const [loading, setLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [mounted, setMounted] = useState(false)

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

  // Summary calculations
  const totalHolidays = publicHolidays.length
  const nationalHolidays = publicHolidays.filter(h => h.state === 'NAT').length
  const stateSpecificHolidays = publicHolidays.filter(h => h.state !== 'NAT').length

  useEffect(() => {
    setHydrated(true)
    setMounted(true)
  }, [])

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
        cell: ({ row }) => (
          <span className="font-bold text-foreground">
            {formatHolidayDate(row.original.date)}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.name}
          </span>
        ),
      },
      {
        accessorKey: "state",
        header: ({ column }) => <DataTableColumnHeader column={column} title="State" />,
        cell: ({ row }) => <StateBadge state={row.original.state} />,
      },
      {
        accessorKey: "isRecurring",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Recurring" />,
        cell: ({ row }) => <RecurringBadge isRecurring={row.original.isRecurring} />,
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

  const handleTodayClick = () => {
    setSelectedYear(currentYear)
  }

  const handleYearChange = (year: number) => {
    setSelectedYear(year)
  }

  // State selector component
  const stateSelector = (
    <div className="flex items-center gap-2">
      <MapPin className="h-4 w-4 text-muted-foreground" />
      <select
        value={selectedState}
        onChange={(e) => setSelectedState(e.target.value)}
        className="h-8 rounded-md border border-input bg-background px-2 text-sm min-w-[80px] focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="All">All States</option>
        {STATE_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  )

  // Prevent hydration mismatch
  if (!mounted) return null

  return (
    <CalendarPageShell
      containerClassName="px-4 sm:px-6"
      toolbar={
        <UnifiedCalendarTopbar
          onToday={handleTodayClick}
          title="Public Holidays"
          titleBadge={
            hydrated && totalHolidays > 0 ? (
              <Badge variant="secondary" className="ml-2">
                {totalHolidays} holidays
              </Badge>
            ) : null
          }
          nav={
            <PublicHolidayYearNavigator
              selectedYear={selectedYear}
              onYearChange={handleYearChange}
            />
          }
          peopleSelect={stateSelector}
          actions={
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={handleSeed} 
                disabled={seedLoading}
                size="sm"
              >
                {seedLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Seed Year
              </Button>
              <Button onClick={() => setAddOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Holiday
              </Button>
            </div>
          }
        />
      }
    >
      <div className="space-y-6">
        {/* Feedback Message */}
        {seedMessage && (
          <div className="rounded-md bg-muted/50 px-4 py-3 text-sm text-muted-foreground border">
            {seedMessage}
          </div>
        )}

        {/* Summary Cards */}
        <InfoGrid columns={3}>
          <InfoCard title="Total Holidays">
            <div className="text-2xl font-bold tabular-nums">
              {hydrated ? totalHolidays : "—"}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              For {selectedYear}
            </p>
          </InfoCard>
          
          <InfoCard title="National">
            <div className="text-2xl font-bold tabular-nums">
              {hydrated ? nationalHolidays : "—"}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Applies across all states
            </p>
          </InfoCard>
          
          <InfoCard title="State-specific">
            <div className="text-2xl font-bold tabular-nums">
              {hydrated ? stateSpecificHolidays : "—"}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedState === 'All' ? 'Filtered by current selection' : `For ${selectedState} only`}
            </p>
          </InfoCard>
        </InfoGrid>

        {/* Main Card */}
        <Card>
          <CardHeader>
            <CardTitle>Holiday Register</CardTitle>
            <CardDescription>
              Browse, filter, and maintain holiday entries for payroll calculations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Table Area */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading holidays...</span>
                </div>
              </div>
            ) : publicHolidays.length === 0 ? (
              <TableEmptyState
                title="No holidays found"
                description={`No holidays found for ${selectedYear}${selectedState !== 'All' ? ` in ${selectedState}` : ''}. Try seeding this year to add the standard holiday set.`}
                action={{
                  label: "Seed Year",
                  onClick: handleSeed,
                  icon: <Sparkles className="h-4 w-4" />
                }}
              />
            ) : (
              <DataTable
                columns={columns}
                data={publicHolidays}
                initialPageSize={25}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <FormDialogShell
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add Public Holiday"
        description="Create a public holiday entry that can be used by penalty rate calculations."
        onSubmit={(e) => {
          e.preventDefault();
          handleCreate();
        }}
        submitLabel="Add Holiday"
        loading={createLoading}
        disabled={!createDate || !createName.trim()}
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Name</label>
            <Input 
              value={createName} 
              onChange={(e) => setCreateName(e.target.value)} 
              placeholder="Christmas Day" 
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Date</label>
            <input
              type="date"
              value={createDate}
              onChange={(e) => setCreateDate(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">State</label>
            <select
              value={createState}
              onChange={(e) => setCreateState(e.target.value as StateOption)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
            <p className="text-xs text-muted-foreground ml-2">
              Use this for holidays that occur on the same calendar date each year.
            </p>
          </div>
        </div>
      </FormDialogShell>

      <ConfirmDialogShell
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete public holiday?"
        description={
          deleteTarget ? (
            <span>
              This will permanently delete{" "}
              <span className="font-medium">{deleteTarget.name}</span>{" "}
              ({formatHolidayDate(deleteTarget.date)}). This action cannot be undone.
            </span>
          ) : (
            "This action cannot be undone."
          )
        }
        onConfirm={handleDelete}
        confirmLabel="Delete"
        loading={deleteLoading}
        variant="destructive"
      />
    </CalendarPageShell>
  )
}

