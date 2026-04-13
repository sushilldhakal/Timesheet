"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Minus, RefreshCw } from "lucide-react"

interface VersionData {
  _id: string
  version: string
  effectiveFrom: string
  effectiveTo: string | null
  rules: any[]
  levelRates: any[]
  availableTags: any[]
}

interface VersionComparisonProps {
  fromVersion: VersionData
  toVersion: VersionData
}

interface DiffItem {
  type: "added" | "removed" | "modified"
  label: string
  details?: string
}

function diffRules(fromRules: any[], toRules: any[]): DiffItem[] {
  const diffs: DiffItem[] = []
  const fromMap = new Map(fromRules.map((r) => [r.id || r.name, r]))
  const toMap = new Map(toRules.map((r) => [r.id || r.name, r]))

  for (const [key, rule] of toMap) {
    if (!fromMap.has(key)) {
      diffs.push({
        type: "added",
        label: rule.name,
        details: `${rule.outcome?.type} ${rule.outcome?.multiplier ? `${rule.outcome.multiplier}x` : ""}`,
      })
    }
  }

  for (const [key, rule] of fromMap) {
    if (!toMap.has(key)) {
      diffs.push({
        type: "removed",
        label: rule.name,
        details: `${rule.outcome?.type} ${rule.outcome?.multiplier ? `${rule.outcome.multiplier}x` : ""}`,
      })
    }
  }

  for (const [key, fromRule] of fromMap) {
    const toRule = toMap.get(key)
    if (!toRule) continue

    const changes: string[] = []

    if (fromRule.outcome?.type !== toRule.outcome?.type) {
      changes.push(`type: ${fromRule.outcome?.type} → ${toRule.outcome?.type}`)
    }
    if (fromRule.outcome?.multiplier !== toRule.outcome?.multiplier) {
      changes.push(`multiplier: ${fromRule.outcome?.multiplier}x → ${toRule.outcome?.multiplier}x`)
    }
    if (fromRule.outcome?.flatRate !== toRule.outcome?.flatRate) {
      changes.push(`flat rate: $${fromRule.outcome?.flatRate} → $${toRule.outcome?.flatRate}`)
    }
    if (fromRule.isActive !== toRule.isActive) {
      changes.push(`status: ${fromRule.isActive ? "active" : "inactive"} → ${toRule.isActive ? "active" : "inactive"}`)
    }
    if (fromRule.priority !== toRule.priority) {
      changes.push(`priority: ${fromRule.priority} → ${toRule.priority}`)
    }

    if (changes.length > 0) {
      diffs.push({
        type: "modified",
        label: fromRule.name,
        details: changes.join(", "),
      })
    }
  }

  return diffs
}

function diffLevelRates(fromRates: any[], toRates: any[]): DiffItem[] {
  const diffs: DiffItem[] = []
  const makeKey = (r: any) => `${r.level}|${r.employmentType}`
  const fromMap = new Map(fromRates.map((r) => [makeKey(r), r]))
  const toMap = new Map(toRates.map((r) => [makeKey(r), r]))

  for (const [key, rate] of toMap) {
    if (!fromMap.has(key)) {
      diffs.push({
        type: "added",
        label: `${rate.level} (${(rate.employmentType || "").replace("_", " ")})`,
        details: `$${Number(rate.hourlyRate).toFixed(2)}/hr`,
      })
    }
  }

  for (const [key, rate] of fromMap) {
    if (!toMap.has(key)) {
      diffs.push({
        type: "removed",
        label: `${rate.level} (${(rate.employmentType || "").replace("_", " ")})`,
        details: `$${Number(rate.hourlyRate).toFixed(2)}/hr`,
      })
    }
  }

  for (const [key, fromRate] of fromMap) {
    const toRate = toMap.get(key)
    if (!toRate) continue

    if (fromRate.hourlyRate !== toRate.hourlyRate) {
      diffs.push({
        type: "modified",
        label: `${fromRate.level} (${(fromRate.employmentType || "").replace("_", " ")})`,
        details: `$${Number(fromRate.hourlyRate).toFixed(2)}/hr → $${Number(toRate.hourlyRate).toFixed(2)}/hr`,
      })
    }
  }

  return diffs
}

function diffTags(fromTags: any[], toTags: any[]): DiffItem[] {
  const diffs: DiffItem[] = []
  const getName = (t: any) => (typeof t === "string" ? t : t.name)
  const fromNames = new Set(fromTags.map(getName))
  const toNames = new Set(toTags.map(getName))

  for (const name of toNames) {
    if (!fromNames.has(name)) {
      diffs.push({ type: "added", label: name })
    }
  }

  for (const name of fromNames) {
    if (!toNames.has(name)) {
      diffs.push({ type: "removed", label: name })
    }
  }

  return diffs
}

function DiffIcon({ type }: { type: DiffItem["type"] }) {
  switch (type) {
    case "added":
      return <Plus className="h-3 w-3 text-green-600" />
    case "removed":
      return <Minus className="h-3 w-3 text-red-600" />
    case "modified":
      return <RefreshCw className="h-3 w-3 text-amber-600" />
  }
}

function DiffBadge({ type }: { type: DiffItem["type"] }) {
  const map = {
    added: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
    removed: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300",
    modified: "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300",
  }
  return (
    <Badge className={`text-xs ${map[type]}`}>
      <DiffIcon type={type} />
      <span className="ml-1 capitalize">{type}</span>
    </Badge>
  )
}

export function VersionComparison({ fromVersion, toVersion }: VersionComparisonProps) {
  const ruleDiffs = diffRules(fromVersion.rules ?? [], toVersion.rules ?? [])
  const rateDiffs = diffLevelRates(fromVersion.levelRates ?? [], toVersion.levelRates ?? [])
  const tagDiffs = diffTags(fromVersion.availableTags ?? [], toVersion.availableTags ?? [])

  const noDiffs = ruleDiffs.length === 0 && rateDiffs.length === 0 && tagDiffs.length === 0

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground text-center">
        Comparing <strong>v{fromVersion.version}</strong> → <strong>v{toVersion.version}</strong>
      </div>

      {noDiffs ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          No differences found between these versions
        </div>
      ) : (
        <>
          {/* Rule Diffs */}
          {ruleDiffs.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Rules ({ruleDiffs.length} changes)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {ruleDiffs.map((diff, i) => (
                    <div key={i} className="flex items-center justify-between p-2 border rounded text-sm">
                      <div className="flex items-center gap-2">
                        <DiffIcon type={diff.type} />
                        <span className="font-medium">{diff.label}</span>
                        {diff.details && (
                          <span className="text-muted-foreground">{diff.details}</span>
                        )}
                      </div>
                      <DiffBadge type={diff.type} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rate Diffs */}
          {rateDiffs.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Level Rates ({rateDiffs.length} changes)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {rateDiffs.map((diff, i) => (
                    <div key={i} className="flex items-center justify-between p-2 border rounded text-sm">
                      <div className="flex items-center gap-2">
                        <DiffIcon type={diff.type} />
                        <span className="font-medium">{diff.label}</span>
                        {diff.details && (
                          <span className="text-muted-foreground">{diff.details}</span>
                        )}
                      </div>
                      <DiffBadge type={diff.type} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tag Diffs */}
          {tagDiffs.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Tags ({tagDiffs.length} changes)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tagDiffs.map((diff, i) => (
                    <div key={i} className="flex items-center justify-between p-2 border rounded text-sm">
                      <div className="flex items-center gap-2">
                        <DiffIcon type={diff.type} />
                        <span className="font-medium">{diff.label}</span>
                      </div>
                      <DiffBadge type={diff.type} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
