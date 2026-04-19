"use client"

import { useState, useEffect } from "react"
import { useLocations } from "@/lib/queries/locations"
import {
  useDemandForecasts,
  useGenerateForecast,
  useRosterSuggestions,
  useGenerateRosterSuggestions,
} from "@/lib/hooks/use-demand-forecast"
import { useAuth } from "@/lib/hooks/use-auth"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, Users, Sparkles, CalendarDays, AlignJustify, Columns, LayoutGrid, Loader2 } from "lucide-react"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { Progress } from "@/components/ui/progress"
import { CalendarPageShell } from "@/components/dashboard/calendar/CalendarPageShell"
import { UnifiedCalendarTopbar } from "@/components/dashboard/calendar/UnifiedCalendarTopbar"
import { TimesheetDateNavigator } from "@/components/timesheet/timesheet-date-navigator"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import type { TimesheetView } from "@/components/timesheet/timesheet-view-tabs"

function ForecastCard({ forecast }: { forecast: any }) {
  const confidence = forecast.recommendedStaffCount > 0 ? 0.75 : 0.4
  const isHighConfidence = confidence >= 0.7

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-semibold">{format(new Date(forecast.date), "EEEE, MMM d")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][forecast.dayOfWeek]}
            </p>
          </div>
          <Badge
            variant="secondary"
            className={
              isHighConfidence
                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
            }
          >
            {isHighConfidence ? "High confidence" : "Low confidence"}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-lg font-bold">{forecast.recommendedStaffCount}</p>
              <p className="text-xs text-muted-foreground">Staff needed</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-lg font-bold">{forecast.predictedSales?.toFixed(1) ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Predicted hrs</p>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Confidence</span>
            <span>{Math.round(confidence * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full ${isHighConfidence ? "bg-green-500" : "bg-yellow-500"}`}
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ForecastsTab({ locationId, startDate, endDate }: { locationId: string; startDate: string; endDate: string }) {
  const { data: forecasts = [], isLoading } = useDemandForecasts(locationId || undefined, startDate, endDate)

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : forecasts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No forecasts yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              {locationId ? "Generate a forecast to get started" : "Select a location first"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {forecasts.map((forecast: any) => (
            <ForecastCard key={forecast._id} forecast={forecast} />
          ))}
        </div>
      )}
    </div>
  )
}

function RosterSuggestionsTab({ locationId, startDate }: { locationId: string; startDate: string }) {
  const weekStartDate = format(startOfWeek(new Date(startDate), { weekStartsOn: 1 }), "yyyy-MM-dd")
  const { data: suggestions = [], isLoading } = useRosterSuggestions(locationId || undefined, weekStartDate)

  return (
    <div className="space-y-4">
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : suggestions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No suggestions yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              {locationId ? "Suggestions will appear based on demand forecasts" : "Select a location first"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Suggested Employees</th>
                <th className="text-left px-4 py-3 font-medium">Confidence</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {suggestions.map((suggestion: any) => (
                <tr key={suggestion._id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    {format(new Date(suggestion.date), "EEE, MMM d")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-muted-foreground">
                      {suggestion.suggestedEmployees?.length ?? 0} employee(s)
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {suggestion.suggestedEmployees?.[0]?.confidenceScore != null ? (
                      <span>{Math.round(suggestion.suggestedEmployees[0].confidenceScore * 100)}%</span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="capitalize">{suggestion.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" disabled title="Coming soon">
                      Apply to Roster
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function DemandForecastPage() {
  const { user } = useAuth()
  const isAdmin = isAdminOrSuperAdmin(user?.role ?? null)

  // Admins pick a location; managers/supervisors use their own location automatically
  const scopedLocationId = !isAdmin ? (user?.location?.[0] ?? "") : ""
  const [adminLocationId, setAdminLocationId] = useState("")
  const locationId = isAdmin ? adminLocationId : scopedLocationId

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [view, setView] = useState<TimesheetView>("week")
  const [activeTab, setActiveTab] = useState("forecasts")
  const [useCustomRange, setUseCustomRange] = useState(false)
  const [customStartDate, setCustomStartDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [customEndDate, setCustomEndDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [forecastDialogOpen, setForecastDialogOpen] = useState(false)
  const [suggestionsDialogOpen, setSuggestionsDialogOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Only fetch locations list for admins (for the selector)
  const locationsQuery = useLocations({ enabled: isAdmin })
  const locations = locationsQuery.data?.locations ?? []

  useEffect(() => { setMounted(true) }, [])

  const generateForecast = useGenerateForecast()
  const generateSuggestions = useGenerateRosterSuggestions()

  const dateRange = (() => {
    if (useCustomRange) {
      return { from: customStartDate, to: customEndDate }
    }
    if (view === "day") {
      return {
        from: format(selectedDate, "yyyy-MM-dd"),
        to: format(selectedDate, "yyyy-MM-dd"),
      }
    } else if (view === "week") {
      return {
        from: format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        to: format(endOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      }
    } else {
      return {
        from: format(startOfMonth(selectedDate), "yyyy-MM-dd"),
        to: format(endOfMonth(selectedDate), "yyyy-MM-dd"),
      }
    }
  })()

  const handleTodayClick = () => {
    setSelectedDate(new Date())
    setUseCustomRange(false)
  }

  const handleCustomRangeChange = (start: string, end: string) => {
    setCustomStartDate(start)
    setCustomEndDate(end)
    setUseCustomRange(true)
  }

  const viewSwitcher = (
    <div className="flex items-center gap-0.5 rounded-lg bg-muted p-1">
      {([
        { k: "day" as const, l: "Day", Icon: AlignJustify },
        { k: "week" as const, l: "Week", Icon: Columns },
        { k: "month" as const, l: "Month", Icon: LayoutGrid },
      ] satisfies { k: TimesheetView; l: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[]).map(({ k, l, Icon }) => {
        const active = view === k
        return (
          <button
            key={k}
            onClick={() => {
              setView(k)
              setUseCustomRange(false)
            }}
            title={l}
            className={[
              "flex h-7 items-center justify-center gap-1 overflow-hidden rounded-md text-xs transition-all duration-200 ease-in-out",
              active ? "w-[76px] bg-background font-semibold text-foreground shadow-sm" : "w-8 bg-transparent font-normal text-muted-foreground",
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
  )

  // Only admins see the location selector
  const locationSelect = isAdmin ? (
    <select
      value={adminLocationId}
      onChange={(e) => setAdminLocationId(e.target.value)}
      className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm"
    >
      <option value="">All locations</option>
      {mounted && locations.map((loc: any) => (
        <option key={loc.id} value={loc.id}>
          {loc.name}
        </option>
      ))}
    </select>
  ) : null

  const handleGenerateForecast = () => {
    if (!locationId) return
    setForecastDialogOpen(true)
    generateForecast.mutate({ locationId, targetDate: dateRange.from, historicalWeeks: 8 })
  }

  const handleGenerateSuggestions = () => {
    if (!locationId) return
    setSuggestionsDialogOpen(true)
    generateSuggestions.mutate({ locationId, weekStartDate: dateRange.from })
  }

  const actionButton = activeTab === "forecasts" ? (
    <Button
      onClick={handleGenerateForecast}
      disabled={!locationId || generateForecast.isPending}
      size="sm"
    >
      <Sparkles className="mr-2 h-4 w-4" />
      {generateForecast.isPending ? "Generating..." : "Generate Forecast"}
    </Button>
  ) : (
    <Button
      onClick={handleGenerateSuggestions}
      disabled={!locationId || generateSuggestions.isPending}
      size="sm"
    >
      <Sparkles className="mr-2 h-4 w-4" />
      {generateSuggestions.isPending ? "Generating..." : "Generate Suggestions"}
    </Button>
  )

  // Prevent hydration mismatch — user/location data is only available client-side
  if (!mounted) return null

  return (
    <CalendarPageShell
      containerClassName="px-4 sm:px-6"
      toolbar={
        <UnifiedCalendarTopbar
          onToday={handleTodayClick}
          title={format(selectedDate, "MMMM yyyy")}
          nav={
            <div className="flex items-center gap-2">
              {view === "day" ? (
                <DateRangePicker
                  value={{
                    startDate: useCustomRange ? customStartDate : format(selectedDate, "yyyy-MM-dd"),
                    endDate: useCustomRange ? customEndDate : format(selectedDate, "yyyy-MM-dd"),
                  }}
                  onChange={handleCustomRangeChange}
                  placeholder="Select date or range"
                />
              ) : (
                <TimesheetDateNavigator
                  view={view}
                  selectedDate={selectedDate}
                  onDateChange={(date) => {
                    setSelectedDate(date)
                    setUseCustomRange(false)
                  }}
                />
              )}
            </div>
          }
          viewSwitcher={viewSwitcher}
          peopleSelect={locationSelect}
          actions={actionButton}
        />
      }
    >
      <div className="space-y-6">
        <div className="border-b">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("forecasts")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "forecasts"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Forecasts
            </button>
            <button
              onClick={() => setActiveTab("suggestions")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "suggestions"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Roster Suggestions
            </button>
          </div>
        </div>

        <div>
          {activeTab === "forecasts" && (
            <ForecastsTab locationId={locationId} startDate={dateRange.from} endDate={dateRange.to} />
          )}
          {activeTab === "suggestions" && (
            <RosterSuggestionsTab locationId={locationId} startDate={dateRange.from} />
          )}
        </div>
      </div>

      {/* Generate Forecast Dialog */}
      <AlertDialog
        open={forecastDialogOpen}
        onOpenChange={(open) => {
          if (generateForecast.isPending) return
          setForecastDialogOpen(open)
        }}
      >
        <AlertDialogContent className="max-w-[560px] overflow-hidden border-border/70 p-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="sr-only">Generating forecast</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {generateForecast.isPending ? (
                  <div className="space-y-4 p-5">
                    <div className="rounded-xl border border-primary/20 bg-linear-to-br from-primary/12 via-primary/6 to-background p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-md border border-primary/30 bg-background/70 p-1.5">
                          <Sparkles className="size-4 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-foreground">Generating forecast...</p>
                          <p className="text-sm text-muted-foreground">Analyzing historical patterns and creating demand predictions.</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                      <div className="mb-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <Loader2 className="size-3.5 animate-spin" />
                          Processing data
                        </div>
                      </div>
                      <Progress value={50} className="h-2.5" />
                      <p className="mt-2 text-xs text-muted-foreground">Please wait, do not close this window.</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generate Suggestions Dialog */}
      <AlertDialog
        open={suggestionsDialogOpen}
        onOpenChange={(open) => {
          if (generateSuggestions.isPending) return
          setSuggestionsDialogOpen(open)
        }}
      >
        <AlertDialogContent className="max-w-[560px] overflow-hidden border-border/70 p-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="sr-only">Generating suggestions</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {generateSuggestions.isPending ? (
                  <div className="space-y-4 p-5">
                    <div className="rounded-xl border border-primary/20 bg-linear-to-br from-primary/12 via-primary/6 to-background p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-md border border-primary/30 bg-background/70 p-1.5">
                          <Sparkles className="size-4 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-foreground">Generating suggestions...</p>
                          <p className="text-sm text-muted-foreground">Creating optimal roster recommendations based on demand forecasts.</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                      <div className="mb-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <Loader2 className="size-3.5 animate-spin" />
                          Analyzing demand
                        </div>
                      </div>
                      <Progress value={50} className="h-2.5" />
                      <p className="mt-2 text-xs text-muted-foreground">Please wait, do not close this window.</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    </CalendarPageShell>
  )
}
