"use client"

import { useState } from "react"
import { useComplianceViolations, useResolveViolation, type ComplianceViolation } from "@/lib/hooks/use-compliance-violations"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle, AlertTriangle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

const RULE_TYPE_LABELS: Record<string, string> = {
  REST_PERIOD: "Rest Period",
  CONSECUTIVE_DAYS: "Consecutive Days",
  MAX_HOURS: "Max Hours",
  BREAK_REQUIREMENT: "Break Requirement",
}

function SeverityBadge({ severity }: { severity: "warning" | "breach" }) {
  return severity === "breach" ? (
    <Badge variant="destructive" className="gap-1">
      <AlertTriangle className="h-3 w-3" />
      Breach
    </Badge>
  ) : (
    <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
      <AlertTriangle className="h-3 w-3" />
      Warning
    </Badge>
  )
}

export function ViolationsTable() {
  const [ruleTypeFilter, setRuleTypeFilter] = useState("all")
  const [severityFilter, setSeverityFilter] = useState<"all" | "warning" | "breach">("all")
  const [resolveTarget, setResolveTarget] = useState<ComplianceViolation | null>(null)
  const [resolveNotes, setResolveNotes] = useState("")

  const { data: violations = [], isLoading } = useComplianceViolations({
    severity: severityFilter === "all" ? undefined : severityFilter,
  })

  const resolveViolation = useResolveViolation()

  const filtered = violations.filter((v) => {
    if (ruleTypeFilter !== "all" && v.ruleType !== ruleTypeFilter) return false
    return true
  })

  const handleResolve = () => {
    if (!resolveTarget) return
    resolveViolation.mutate(
      { id: resolveTarget._id, action: "manual_override", notes: resolveNotes },
      {
        onSuccess: () => {
          setResolveTarget(null)
          setResolveNotes("")
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="min-w-44">
          <Select value={ruleTypeFilter} onValueChange={setRuleTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Rule Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rule Types</SelectItem>
              {Object.entries(RULE_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-36">
          <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="warning">Warnings</SelectItem>
              <SelectItem value="breach">Breaches</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
          <CheckCircle className="h-10 w-10 text-green-500 mb-3" />
          <p className="font-medium">No violations found</p>
          <p className="text-sm text-muted-foreground mt-1">All compliance checks are passing</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Rule Type</th>
                <th className="text-left px-4 py-3 font-medium">Severity</th>
                <th className="text-left px-4 py-3 font-medium">Description</th>
                <th className="text-left px-4 py-3 font-medium">Detected</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((violation) => (
                <tr key={violation._id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium">
                      {RULE_TYPE_LABELS[violation.ruleType] ?? violation.ruleType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <SeverityBadge severity={violation.severity} />
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate text-muted-foreground">{violation.message}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(violation.detectedAt), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    {violation.isActive ? (
                      <Badge variant="outline" className="text-orange-600 border-orange-300">Open</Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-300">Resolved</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {violation.isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setResolveTarget(violation)}
                      >
                        Resolve
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Resolve Dialog */}
      <Dialog open={!!resolveTarget} onOpenChange={(open) => !open && setResolveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Violation</DialogTitle>
            <DialogDescription>
              Mark this compliance violation as resolved. Add notes to explain the resolution.
            </DialogDescription>
          </DialogHeader>
          {resolveTarget && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="font-medium">{RULE_TYPE_LABELS[resolveTarget.ruleType] ?? resolveTarget.ruleType}</p>
                <p className="text-muted-foreground mt-1">{resolveTarget.message}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="resolve-notes">Resolution Notes (optional)</Label>
                <Textarea
                  id="resolve-notes"
                  placeholder="Explain why this violation is being resolved..."
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={resolveViolation.isPending}>
              {resolveViolation.isPending ? "Resolving..." : "Resolve Violation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
