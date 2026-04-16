"use client"

import { format } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UnifiedCalendarTopbar } from "@/components/dashboard/calendar/UnifiedCalendarTopbar"
import { TimesheetDateNavigator } from "@/components/timesheet/timesheet-date-navigator"
import type { TimesheetView } from "@/components/timesheet/timesheet-view-tabs"
import { AlignJustify, Clock, Columns, FileDown, LayoutGrid, Printer } from "lucide-react"
import { TimesheetEntriesList, type TimesheetEntryRow } from "@/components/timesheet/TimesheetEntriesList"
import { TimesheetShiftChart } from "@/components/timesheet/TimesheetShiftChart"

export function TimesheetViewer({
  title,
  subtitle,
  employeeName,
  employeeImageUrl,
  view,
  onViewChange,
  selectedDate,
  onSelectedDateChange,
  useCustomRange,
  customStartDate,
  customEndDate,
  startDate,
  endDate,
  onCustomRangeChange,
  onToday,
  entries,
  loading,
  error,
  onExportCsv,
  onPrint,
  renderEntries,
}: {
  title: string
  subtitle?: string
  employeeName: string
  employeeImageUrl?: string
  view: TimesheetView
  onViewChange: (view: TimesheetView) => void
  selectedDate: Date
  onSelectedDateChange: (date: Date) => void
  useCustomRange: boolean
  customStartDate: string
  customEndDate: string
  startDate: string
  endDate: string
  onCustomRangeChange: (start: string, end: string) => void
  onToday: () => void
  entries: TimesheetEntryRow[]
  loading: boolean
  error?: unknown
  onExportCsv?: () => void
  onPrint?: () => void
  renderEntries?: (args: {
    entries: TimesheetEntryRow[]
    employeeName: string
    employeeImageUrl?: string
  }) => React.ReactNode
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {subtitle ? <p className="text-muted-foreground">{subtitle}</p> : null}
      </div>

      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timesheet
              </CardTitle>
              <CardDescription>Daily punch records and hours worked</CardDescription>
            </div>
          </div>

          <UnifiedCalendarTopbar
            onToday={onToday}
            title={format(selectedDate, "MMMM yyyy")}
            nav={
              <TimesheetDateNavigator
                view={view}
                selectedDate={selectedDate}
                onDateChange={(date) => {
                  onSelectedDateChange(date)
                }}
                rangeValue={
                  useCustomRange ? { startDate: customStartDate, endDate: customEndDate } : undefined
                }
                onRangeChange={onCustomRangeChange}
              />
            }
            viewSwitcher={
              <div className="flex items-center gap-0.5 rounded-lg bg-muted p-1">
                {([
                  { k: "day" as const, l: "Day", Icon: AlignJustify },
                  { k: "week" as const, l: "Week", Icon: Columns },
                  { k: "month" as const, l: "Month", Icon: LayoutGrid },
                ] satisfies {
                  k: TimesheetView
                  l: string
                  Icon: React.ComponentType<{ size?: number; className?: string }>
                }[]).map(({ k, l, Icon }) => {
                  const active = view === k
                  return (
                    <button
                      key={k}
                      onClick={() => onViewChange(k)}
                      title={l}
                      className={[
                        "flex h-7 items-center justify-center gap-1 overflow-hidden rounded-md text-xs transition-all duration-200 ease-in-out",
                        active
                          ? "w-[76px] bg-background font-semibold text-foreground shadow-sm"
                          : "w-8 bg-transparent font-normal text-muted-foreground",
                      ].join(" ")}
                      type="button"
                    >
                      <Icon size={14} className="shrink-0" />
                      <span
                        className={[
                          "overflow-hidden whitespace-nowrap transition-all duration-200 ease-in-out",
                          active ? "max-w-[44px] opacity-100" : "max-w-0 opacity-0",
                        ].join(" ")}
                      >
                        {l}
                      </span>
                    </button>
                  )
                })}
              </div>
            }
            actions={
              onExportCsv || onPrint ? (
                <div className="flex items-center gap-2">
                  {onExportCsv ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loading || entries.length === 0}
                      onClick={onExportCsv}
                    >
                      <FileDown className="size-4" />
                      Export CSV
                    </Button>
                  ) : null}
                  {onPrint ? (
                    <Button variant="outline" size="sm" disabled={loading} onClick={onPrint}>
                      <Printer className="size-4" />
                      Print
                    </Button>
                  ) : null}
                </div>
              ) : null
            }
          />
        </CardHeader>

        <CardContent className="p-0">
          {error ? (
            <div className="p-6">
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <div className="text-center py-4">
                    <p className="text-sm text-destructive mb-2">Failed to load timesheet data</p>
                    <p className="text-xs text-muted-foreground">
                      {error instanceof Error ? error.message : "Please try again later"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">Loading timesheet data...</p>
                  </div>
                </div>
              ) : (
                <>
                  {renderEntries ? (
                    renderEntries({ entries, employeeName, employeeImageUrl })
                  ) : (
                    <TimesheetEntriesList
                      entries={entries}
                      employeeName={employeeName}
                      employeeImageUrl={employeeImageUrl}
                    />
                  )}
                  <div className="mt-6">
                    <TimesheetShiftChart entries={entries} />
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

