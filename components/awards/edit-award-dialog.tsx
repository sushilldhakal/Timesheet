"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, X, Save, Trash2, Clock, DollarSign, Coffee, Calendar, Loader2, AlertCircle, Tag, Edit, GitBranch } from "lucide-react"
import { Award, AwardTag, AwardLevelRate, AwardRule } from "@/lib/validations/awards"
import { EditRuleForm } from "./edit-rule-form"
import { AwardVersionHistory } from "./award-version-history"
import { updateAward } from "@/lib/api/awards"

interface EditAwardDialogProps {
  award: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: (award: Award) => void
}

export function EditAwardDialog({ award, open, onOpenChange, onSave }: EditAwardDialogProps) {
  const [formData, setFormData] = useState<Partial<Award>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Rule editing state
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null)
  const [editRuleOpen, setEditRuleOpen] = useState(false)
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false)

  const [newLevelRate, setNewLevelRate] = useState({
    level: "",
    employmentType: "full_time" as const,
    hourlyRate: 0,
    effectiveFrom: new Date(),
  })

  const [newTag, setNewTag] = useState<Partial<AwardTag>>({
    name: "",
    description: "",
    overridesBehavior: "modify",
  })

  useEffect(() => {
    if (award) {
      setFormData({
        name: award.name,
        description: award.description,
        rules: (award.rules || []).map((r: any) => ({ ...r })),
        availableTags: (award.availableTags || []).map((t: any) => ({ ...t })),
        levelRates: (award.levelRates || []).map((lr: any) => ({ ...lr })),
        isActive: award.isActive,
        version: award.version,
      })
      setError(null)
    }
  }, [award])

  const handleSave = async () => {
    if (!formData.name) return

    const updatedAward: Award = {
      name: formData.name!,
      description: formData.description || "",
      levelRates: formData.levelRates || [],
      rules: formData.rules || [],
      availableTags: formData.availableTags || [],
      isActive: formData.isActive ?? true,
      version: formData.version || "1.0.0",
    }

    if (onSave) {
      onSave(updatedAward)
      onOpenChange(false)
      return
    }

    // Convert dates to strings for API
    const apiPayload = {
      ...updatedAward,
      levelRates: updatedAward.levelRates.map(lr => ({
        level: lr.level,
        employmentType: lr.employmentType,
        hourlyRate: lr.hourlyRate,
        effectiveFrom: lr.effectiveFrom instanceof Date ? lr.effectiveFrom.toISOString() : lr.effectiveFrom,
        effectiveTo: lr.effectiveTo instanceof Date ? lr.effectiveTo.toISOString() : lr.effectiveTo,
      })),
    }

    setSaving(true)
    setError(null)
    try {
      await updateAward(award._id, apiPayload as any)
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || "Failed to update award")
    } finally {
      setSaving(false)
    }
  }

  // ─── Level Rate helpers ──────────────────────────────────
  const addLevelRate = () => {
    if (!newLevelRate.level || newLevelRate.hourlyRate <= 0) return
    const rate: AwardLevelRate = {
      level: newLevelRate.level,
      employmentType: newLevelRate.employmentType,
      hourlyRate: newLevelRate.hourlyRate,
      effectiveFrom: newLevelRate.effectiveFrom,
    }
    setFormData(prev => ({
      ...prev,
      levelRates: [...(prev.levelRates || []), rate],
    }))
    setNewLevelRate({ level: "", employmentType: "full_time", hourlyRate: 0, effectiveFrom: new Date() })
  }

  const removeLevelRate = (index: number) => {
    setFormData(prev => ({
      ...prev,
      levelRates: prev.levelRates?.filter((_, i) => i !== index) || [],
    }))
  }

  // ─── Rule helpers ────────────────────────────────────────
  const toggleRuleActive = (index: number) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules?.map((rule, i) =>
        i === index ? { ...rule, isActive: !rule.isActive } : rule
      ) || [],
    }))
  }

  const removeRule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules?.filter((_, i) => i !== index) || [],
    }))
  }

  // ─── Tag helpers ─────────────────────────────────────────
  const addTag = () => {
    if (!newTag.name) return
    const tag: AwardTag = {
      name: newTag.name,
      description: newTag.description || "",
      overridesBehavior: newTag.overridesBehavior as any || "modify",
    }
    setFormData(prev => ({
      ...prev,
      availableTags: [...(prev.availableTags || []), tag],
    }))
    setNewTag({ name: "", description: "", overridesBehavior: "modify" })
  }

  const removeTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      availableTags: prev.availableTags?.filter((_, i) => i !== index) || [],
    }))
  }

  // ─── Rule editing helpers ────────────────────────────
  const handleSaveRule = (editedRule: AwardRule) => {
    if (editingRuleIndex !== null) {
      setFormData(prev => ({
        ...prev,
        rules: prev.rules?.map((rule, i) =>
          i === editingRuleIndex ? editedRule : rule
        ) || [],
      }))
    }
    setEditRuleOpen(false)
    setEditingRuleIndex(null)
  }

  // ─── Rule display helpers ────────────────────────────────
  const getRuleIcon = (ruleType: string) => {
    switch (ruleType) {
      case "ordinary": return <Clock className="h-4 w-4" />
      case "overtime": return <DollarSign className="h-4 w-4" />
      case "break": return <Coffee className="h-4 w-4" />
      case "allowance": return <DollarSign className="h-4 w-4" />
      case "toil": return <Calendar className="h-4 w-4" />
      case "leave": return <Calendar className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getRuleTypeColor = (ruleType: string) => {
    switch (ruleType) {
      case "ordinary": return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
      case "overtime": return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
      case "break": return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300"
      case "allowance": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
      case "toil": return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300"
      case "leave": return "bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-300"
      default: return "bg-muted text-muted-foreground"
    }
  }

  const getOutcomeSummary = (outcome: any) => {
    if (!outcome) return null
    switch (outcome.type) {
      case "ordinary":
      case "overtime":
        return `${outcome.multiplier}x rate`
      case "break":
        return `${outcome.durationMinutes}min ${outcome.isPaid ? "paid" : "unpaid"}`
      case "allowance":
        return `$${outcome.flatRate} ${outcome.currency || "AUD"}`
      case "toil":
        return `${outcome.accrualMultiplier}x accrual`
      case "leave":
        return `${outcome.accrualRate}hr/${outcome.leaveType}`
      default:
        return null
    }
  }

  const rules = formData.rules || []
  const tags = formData.availableTags || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Award: {award?.name}</DialogTitle>
          <DialogDescription>
            Modify award settings, rules, and available tags
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="levelRates">Level Rates ({formData.levelRates?.length || 0})</TabsTrigger>
            <TabsTrigger value="rules">Rules ({rules.length})</TabsTrigger>
            <TabsTrigger value="tags">Tags ({tags.length})</TabsTrigger>
          </TabsList>

          {/* ── Basic Info Tab ────────────────────────────── */}
          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Award Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Award Name *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={formData.description || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Version</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-sm px-3 py-1">
                        v{formData.version || "1.0.0"}
                      </Badge>
                      {award?._id && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setVersionHistoryOpen(true)}
                        >
                          <GitBranch className="h-3 w-3 mr-1" />
                          Version History
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Managed automatically. Use Version History to create new versions.
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Active</Label>
                      <div className="text-sm text-muted-foreground">
                        Enable for timesheet processing
                      </div>
                    </div>
                    <Switch
                      checked={formData.isActive ?? true}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Level Rates Tab ───────────────────────────── */}
          <TabsContent value="levelRates" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Award Level Rates</CardTitle>
                  <CardDescription>
                    Base hourly rates for each level and employment type
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.levelRates && formData.levelRates.length > 0 ? (
                  <div className="space-y-2">
                    {formData.levelRates.map((rate: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                            <DollarSign className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium">{rate.level}</div>
                            <div className="text-sm text-muted-foreground capitalize">
                              {(rate.employmentType || "").replace("_", " ")}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-semibold">${Number(rate.hourlyRate).toFixed(2)}/hr</span>
                          <Button size="sm" variant="outline" onClick={() => removeLevelRate(idx)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No level rates configured</p>
                    <p className="text-sm">Add base hourly rates below</p>
                  </div>
                )}

                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Add Level Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Level</Label>
                        <Input
                          placeholder="e.g., level_1"
                          value={newLevelRate.level}
                          onChange={(e) => setNewLevelRate(prev => ({ ...prev, level: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Employment Type</Label>
                        <Select
                          value={newLevelRate.employmentType}
                          onValueChange={(val) => setNewLevelRate(prev => ({ ...prev, employmentType: val as any }))}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full_time">Full Time</SelectItem>
                            <SelectItem value="part_time">Part Time</SelectItem>
                            <SelectItem value="casual">Casual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Hourly Rate ($)</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          value={newLevelRate.hourlyRate || ""}
                          onChange={(e) => setNewLevelRate(prev => ({ ...prev, hourlyRate: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Effective From</Label>
                        <Input
                          type="date"
                          value={newLevelRate.effectiveFrom.toISOString().split("T")[0]}
                          onChange={(e) => setNewLevelRate(prev => ({ ...prev, effectiveFrom: new Date(e.target.value) }))}
                        />
                      </div>
                    </div>
                    <Button
                      className="w-full mt-3"
                      variant="outline"
                      onClick={addLevelRate}
                      disabled={!newLevelRate.level || newLevelRate.hourlyRate <= 0}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Level Rate
                    </Button>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Rules Tab ─────────────────────────────────── */}
          <TabsContent value="rules" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Award Rules</CardTitle>
                  <CardDescription>
                    Configure penalty rates, overtime, breaks, and allowances
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {rules.length > 0 ? (
                  <div className="space-y-3">
                    {rules.map((rule: any, idx: number) => {
                      const outcomeType = rule.outcome?.type || "ordinary"
                      const outcomeSummary = getOutcomeSummary(rule.outcome)
                      return (
                        <div
                          key={rule.id || idx}
                          className={`flex items-center justify-between p-4 border rounded-lg ${!rule.isActive ? "opacity-60" : ""}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${getRuleTypeColor(outcomeType)}`}>
                              {getRuleIcon(outcomeType)}
                            </div>
                            <div>
                              <div className="font-medium">{rule.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {rule.description || "No description"}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  Priority: {rule.priority ?? 0}
                                </Badge>
                                <Badge variant="outline" className="text-xs capitalize">
                                  {outcomeType}
                                </Badge>
                                {outcomeSummary && (
                                  <Badge variant="secondary" className="text-xs">
                                    {outcomeSummary}
                                  </Badge>
                                )}
                                {rule.outcome?.exportName && (
                                  <Badge variant="secondary" className="text-xs font-mono">
                                    {rule.outcome.exportName}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={rule.isActive ?? true}
                              onCheckedChange={() => toggleRuleActive(idx)}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingRuleIndex(idx)
                                setEditRuleOpen(true)
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => removeRule(idx)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No rules configured</p>
                    <p className="text-sm">Rules define how pay is calculated for shifts under this award</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tags Tab ──────────────────────────────────── */}
          <TabsContent value="tags" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Available Award Tags</CardTitle>
                <CardDescription>
                  Tags allow manual overrides of automatic rule processing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {tags.length > 0 ? (
                  <div className="space-y-3">
                    {tags.map((tag: any, index: number) => {
                      const tagName = typeof tag === "string" ? tag : tag.name
                      const tagDesc = typeof tag === "string" ? "" : tag.description || ""
                      const tagBehavior = typeof tag === "string" ? "" : tag.overridesBehavior || ""
                      return (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{tagName}</Badge>
                                {tagBehavior && (
                                  <Badge variant="outline" className="text-xs capitalize">{tagBehavior}</Badge>
                                )}
                              </div>
                              {tagDesc && (
                                <div className="text-sm text-muted-foreground mt-1">{tagDesc}</div>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => removeTag(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No tags configured</p>
                    <p className="text-sm">Add tags to enable manual overrides on shifts</p>
                  </div>
                )}

                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Add Tag</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Tag Name</Label>
                        <Input
                          placeholder="e.g., TOIL, SickLeave"
                          value={newTag.name || ""}
                          onChange={(e) => setNewTag(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Override Behavior</Label>
                        <Select
                          value={newTag.overridesBehavior || "modify"}
                          onValueChange={(val) => setNewTag(prev => ({ ...prev, overridesBehavior: val as any }))}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="modify">Modify</SelectItem>
                            <SelectItem value="override">Override</SelectItem>
                            <SelectItem value="stack">Stack</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Input
                          placeholder="Tag description..."
                          value={newTag.description || ""}
                          onChange={(e) => setNewTag(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                    </div>
                    <Button
                      className="w-full mt-3"
                      variant="outline"
                      onClick={addTag}
                      disabled={!newTag.name}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Tag
                    </Button>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!formData.name || saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Edit Rule Form Modal */}
      {editingRuleIndex !== null && (
        <EditRuleForm
          rule={formData.rules?.[editingRuleIndex] || null}
          open={editRuleOpen}
          onOpenChange={setEditRuleOpen}
          onSave={handleSaveRule}
          availableTags={formData.availableTags || []}
        />
      )}

      {/* Version History Modal */}
      {award?._id && (
        <AwardVersionHistory
          awardId={award._id}
          awardName={award.name || ""}
          open={versionHistoryOpen}
          onOpenChange={setVersionHistoryOpen}
        />
      )}
    </Dialog>
  )
}
