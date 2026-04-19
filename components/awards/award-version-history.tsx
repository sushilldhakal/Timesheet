"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  History,
  Plus,
  Eye,
  GitCompare,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  CalendarDays,
} from "lucide-react"
import { VersionComparison } from "./version-comparison"
import { getAwardVersions, createAwardVersion } from "@/lib/api/awards"

interface AwardVersion {
  _id: string
  name: string
  description?: string
  version: string
  effectiveFrom: string
  effectiveTo: string | null
  changelog: string | null
  isCurrent: boolean
  rules: any[]
  levelRates: any[]
  availableTags: any[]
  createdAt?: string
  createdBy?: string
}

interface AwardVersionHistoryProps {
  awardId: string
  awardName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AwardVersionHistory({ awardId, awardName, open, onOpenChange }: AwardVersionHistoryProps) {
  const [versions, setVersions] = useState<AwardVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [newVersion, setNewVersion] = useState({
    changelog: "",
    effectiveFrom: "",
    versionBump: "minor" as "major" | "minor" | "patch",
  })

  const [viewingVersion, setViewingVersion] = useState<AwardVersion | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareFrom, setCompareFrom] = useState<string>("")
  const [compareTo, setCompareTo] = useState<string>("")

  useEffect(() => {
    if (open && awardId) {
      fetchVersions()
    }
  }, [open, awardId])

  const fetchVersions = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAwardVersions(awardId)
      setVersions(data.versions ?? [])
    } catch (err: any) {
      setError(err.message || "Failed to fetch versions")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateVersion = async () => {
    if (!newVersion.changelog || !newVersion.effectiveFrom) return

    setCreating(true)
    setCreateError(null)
    try {
      await createAwardVersion(awardId, {
        changelog: newVersion.changelog,
        effectiveFrom: new Date(newVersion.effectiveFrom).toISOString(),
        versionBump: newVersion.versionBump,
      })
      setCreateOpen(false)
      setNewVersion({ changelog: "", effectiveFrom: "", versionBump: "minor" })
      await fetchVersions()
    } catch (err: any) {
      setCreateError(err.message || "Failed to create version")
    } finally {
      setCreating(false)
    }
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Present"
    return new Date(dateStr).toLocaleDateString("en-AU", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusBadge = (version: AwardVersion) => {
    if (version.isCurrent) {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Active
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="text-muted-foreground">
        <Clock className="mr-1 h-3 w-3" />
        Expired
      </Badge>
    )
  }

  const compareFromVersion = versions.find((v) => v._id === compareFrom || v.version === compareFrom)
  const compareToVersion = versions.find((v) => v._id === compareTo || v.version === compareTo)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History: {awardName}
          </DialogTitle>
          <DialogDescription>
            Track changes to award rules, rates, and tags over time
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Actions bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant={compareMode ? "default" : "outline"}
              size="sm"
              onClick={() => setCompareMode(!compareMode)}
            >
              <GitCompare className="h-4 w-4 mr-1" />
              {compareMode ? "Exit Compare" : "Compare Versions"}
            </Button>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Version
          </Button>
        </div>

        {/* Compare selectors */}
        {compareMode && (
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">From Version</Label>
                  <Select value={compareFrom} onValueChange={setCompareFrom}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select version..." />
                    </SelectTrigger>
                    <SelectContent>
                      {versions.map((v) => (
                        <SelectItem key={v._id} value={v.version}>
                          v{v.version} ({formatDate(v.effectiveFrom)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">To Version</Label>
                  <Select value={compareTo} onValueChange={setCompareTo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select version..." />
                    </SelectTrigger>
                    <SelectContent>
                      {versions.map((v) => (
                        <SelectItem key={v._id} value={v.version}>
                          v{v.version} ({formatDate(v.effectiveFrom)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {compareFromVersion && compareToVersion && (
                <div className="mt-4">
                  <VersionComparison
                    fromVersion={compareFromVersion}
                    toVersion={compareToVersion}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Version Timeline */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No version history</p>
            <p className="text-sm">Create a new version to start tracking changes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((version, idx) => (
              <Card
                key={version._id}
                className={version.isCurrent ? "border-green-200 dark:border-green-800" : ""}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">v{version.version}</span>
                        {getStatusBadge(version)}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {formatDate(version.effectiveFrom)}
                          {" — "}
                          {formatDate(version.effectiveTo)}
                        </span>
                      </div>
                      {version.changelog && (
                        <p className="text-sm mt-1">{version.changelog}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {version.rules?.length ?? 0} rules
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {version.levelRates?.length ?? 0} rates
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {version.availableTags?.length ?? 0} tags
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingVersion(version)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* View Version Detail Dialog */}
        {viewingVersion && (
          <Dialog open={!!viewingVersion} onOpenChange={() => setViewingVersion(null)}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Version {viewingVersion.version} Details
                </DialogTitle>
                <DialogDescription>
                  {viewingVersion.isCurrent ? "Current active version" : "Historical version"}
                  {" — "}
                  Effective {formatDate(viewingVersion.effectiveFrom)} to{" "}
                  {formatDate(viewingVersion.effectiveTo)}
                </DialogDescription>
              </DialogHeader>

              {viewingVersion.changelog && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Changelog</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{viewingVersion.changelog}</p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Rules ({viewingVersion.rules?.length ?? 0})</CardTitle>
                </CardHeader>
                <CardContent>
                  {viewingVersion.rules?.length ? (
                    <div className="space-y-2">
                      {viewingVersion.rules.map((rule: any, i: number) => (
                        <div key={rule.id || i} className="flex items-center justify-between p-2 border rounded text-sm">
                          <div>
                            <span className="font-medium">{rule.name}</span>
                            <span className="ml-2 text-muted-foreground">
                              ({rule.outcome?.type} {rule.outcome?.multiplier ? `${rule.outcome.multiplier}x` : ""})
                            </span>
                          </div>
                          <Badge variant={rule.isActive ? "default" : "secondary"} className="text-xs">
                            {rule.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No rules in this version</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Level Rates ({viewingVersion.levelRates?.length ?? 0})</CardTitle>
                </CardHeader>
                <CardContent>
                  {viewingVersion.levelRates?.length ? (
                    <div className="space-y-1">
                      {viewingVersion.levelRates.map((rate: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 border rounded text-sm">
                          <span>
                            {rate.level} — <span className="capitalize">{(rate.employmentType || "").replace("_", " ")}</span>
                          </span>
                          <span className="font-semibold">${Number(rate.hourlyRate).toFixed(2)}/hr</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No level rates in this version</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Tags ({viewingVersion.availableTags?.length ?? 0})</CardTitle>
                </CardHeader>
                <CardContent>
                  {viewingVersion.availableTags?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {viewingVersion.availableTags.map((tag: any, i: number) => (
                        <Badge key={i} variant="secondary">
                          {typeof tag === "string" ? tag : tag.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No tags in this version</p>
                  )}
                </CardContent>
              </Card>
            </DialogContent>
          </Dialog>
        )}

        {/* Create New Version Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Version</DialogTitle>
              <DialogDescription>
                Create a new version of {awardName} with a future effective date.
                The current rules will be archived and the new version will take effect on the specified date.
              </DialogDescription>
            </DialogHeader>

            {createError && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {createError}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Effective From *</Label>
                <Input
                  type="datetime-local"
                  value={newVersion.effectiveFrom}
                  onChange={(e) => setNewVersion((prev) => ({ ...prev, effectiveFrom: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Must be a future date</p>
              </div>

              <div className="space-y-2">
                <Label>Version Bump</Label>
                <Select
                  value={newVersion.versionBump}
                  onValueChange={(val) => setNewVersion((prev) => ({ ...prev, versionBump: val as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patch">Patch (small fix)</SelectItem>
                    <SelectItem value="minor">Minor (new rules/rate changes)</SelectItem>
                    <SelectItem value="major">Major (significant restructure)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Changelog *</Label>
                <Textarea
                  placeholder="Describe what changed in this version..."
                  value={newVersion.changelog}
                  onChange={(e) => setNewVersion((prev) => ({ ...prev, changelog: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateVersion}
                disabled={!newVersion.changelog || !newVersion.effectiveFrom || creating}
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {creating ? "Creating..." : "Create Version"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
