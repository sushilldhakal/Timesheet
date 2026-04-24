"use client"

import { useEffect, useMemo, useState } from "react"
import { startOfWeek, endOfWeek, format } from "date-fns"
import { toast } from "@/lib/utils/toast"
import { apiFetch } from "@/lib/api/fetch-client"
import { getEmployees } from "@/lib/api/employees"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { MultiSelect } from "@/components/ui/multi-select"
import { Loader2 } from "lucide-react"

type GenerateScope = "all" | "specific"

export interface BulkGenerateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerated: () => void
}

type BulkGenerateResponse = {
  created?: number
  alreadyExisted?: number
  failed?: Array<{ employeeId?: string; name?: string; error?: string }>
  // allow server to return other fields without breaking the UI
  [k: string]: unknown
}

export function BulkGenerateDialog({ open, onOpenChange, onGenerated }: BulkGenerateDialogProps) {
  const [scope, setScope] = useState<GenerateScope>("all")
  const [employeeOptions, setEmployeeOptions] = useState<Array<{ label: string; value: string }>>([])
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)

  const [range, setRange] = useState<{ from?: Date; to?: Date }>(() => {
    const now = new Date()
    return {
      from: startOfWeek(now, { weekStartsOn: 1 }),
      to: endOfWeek(now, { weekStartsOn: 1 }),
    }
  })

  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<BulkGenerateResponse | null>(null)

  const payPeriodStart = useMemo(() => (range.from ? format(range.from, "yyyy-MM-dd") : ""), [range.from])
  const payPeriodEnd = useMemo(() => (range.to ? format(range.to, "yyyy-MM-dd") : ""), [range.to])

  useEffect(() => {
    if (!open) return
    setResult(null)
    setGenerating(false)
    setScope("all")
    setSelectedEmployeeIds([])
  }, [open])

  useEffect(() => {
    if (!open) return
    if (scope !== "specific") return
    if (employeeOptions.length > 0) return

    const load = async () => {
      setLoadingEmployees(true)
      try {
        const data = await getEmployees({ limit: 1000 })
        const options = (data.employees || []).map((e: any) => ({
          label: e.name ?? "Unknown",
          value: e._id || e.id,
        }))
        setEmployeeOptions(options)
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load employees"
        toast.error(msg)
      } finally {
        setLoadingEmployees(false)
      }
    }

    load()
  }, [open, scope, employeeOptions.length])

  const canGenerate =
    !!payPeriodStart &&
    !!payPeriodEnd &&
    !generating &&
    (scope === "all" || selectedEmployeeIds.length > 0)

  const handleGenerate = async () => {
    if (!canGenerate) return
    setGenerating(true)
    setResult(null)

    try {
      const body: Record<string, unknown> = {
        payPeriodStart,
        payPeriodEnd,
      }
      if (scope === "specific") body.employeeIds = selectedEmployeeIds

      const res = await apiFetch<BulkGenerateResponse>("/api/timesheets/bulk-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      setResult(res)

      const created = Number(res.created ?? 0)
      const existed = Number(res.alreadyExisted ?? 0)
      const failedCount = Array.isArray(res.failed) ? res.failed.length : 0

      if (failedCount > 0) {
        toast.warning({ description: "Timesheets generated with some failures." })
      } else {
        toast.success({ description: "Timesheets generated successfully." })
      }

      // Always refresh list after success response.
      onGenerated()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate timesheets"
      toast.error(msg)
    } finally {
      setGenerating(false)
    }
  }

  const created = Number(result?.created ?? 0)
  const existed = Number(result?.alreadyExisted ?? 0)
  const failed = Array.isArray(result?.failed) ? result!.failed! : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate timesheets</DialogTitle>
          <DialogDescription>
            Bulk-generate draft timesheets for a pay period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Pay Period</Label>
            <DateRangePicker
              dateRange={{ from: range.from, to: range.to }}
              onDateRangeChange={(r) => setRange({ from: r?.from, to: r?.to })}
              placeholder="Pick a pay period"
            />
          </div>

          <div className="space-y-3">
            <Label>Staff scope</Label>
            <RadioGroup value={scope} onValueChange={(v) => setScope(v as GenerateScope)} className="space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="scope-all" />
                <Label htmlFor="scope-all">All active staff</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="specific" id="scope-specific" />
                <Label htmlFor="scope-specific">Specific employees</Label>
              </div>
            </RadioGroup>

            {scope === "specific" && (
              <div className="space-y-2">
                <Label>Employees</Label>
                <MultiSelect
                  options={employeeOptions}
                  onValueChange={setSelectedEmployeeIds}
                  defaultValue={selectedEmployeeIds}
                  placeholder={loadingEmployees ? "Loading employees..." : "Select employees"}
                  disabled={loadingEmployees}
                  maxCount={4}
                  searchable
                  matchTriggerWidth
                />
              </div>
            )}
          </div>

          {generating && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating timesheets…
            </div>
          )}

          {result && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  ✅ {created} created · {existed} already existed · {failed.length} failed
                </CardTitle>
              </CardHeader>
              {failed.length > 0 && (
                <CardContent className="space-y-3 text-sm">
                  <div className="space-y-2">
                    <p className="font-medium">Failures</p>
                    <div className="space-y-2">
                      {failed.map((f, idx) => (
                        <div key={`${f.employeeId ?? f.name ?? "fail"}-${idx}`} className="rounded-md border p-2">
                          <p className="font-medium">{f.name ?? f.employeeId ?? "Unknown employee"}</p>
                          <p className="text-muted-foreground">{f.error ?? "Unknown error"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={!canGenerate} className="gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

