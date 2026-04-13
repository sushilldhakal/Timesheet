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
import { Plus, Trash2, Clock, AlertCircle, Loader2 } from "lucide-react"
import { AwardRule, AwardTag } from "@/lib/validations/awards"

interface EditRuleFormProps {
  rule: AwardRule | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (rule: AwardRule) => void
  availableTags: AwardTag[]
}

const OUTCOME_TYPES = ['ordinary', 'overtime', 'break', 'allowance', 'toil', 'leave'] as const

export function EditRuleForm({
  rule,
  open,
  onOpenChange,
  onSave,
  availableTags,
}: EditRuleFormProps) {
  const [formData, setFormData] = useState<Partial<AwardRule>>({})
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name,
        description: rule.description,
        priority: rule.priority,
        isActive: rule.isActive,
        canStack: rule.canStack,
        conditions: rule.conditions,
        outcome: rule.outcome,
      })
    } else if (open) {
      setFormData({
        isActive: true,
        canStack: false,
        priority: 0,
        conditions: {},
        outcome: { type: 'ordinary', multiplier: 1.0, exportName: '' } as any,
      })
    }
    setError(null)
  }, [rule, open])

  const handleSave = () => {
    setError(null)

    if (!formData.name?.trim()) {
      setError('Rule name is required')
      return
    }

    if (!formData.outcome) {
      setError('Rule outcome is required')
      return
    }

    const outcome = formData.outcome as any
    if (!outcome.type || !OUTCOME_TYPES.includes(outcome.type)) {
      setError('Please select a valid outcome type')
      return
    }

    if (!outcome.exportName?.trim()) {
      setError('Export name is required for the outcome')
      return
    }

    const savedRule: AwardRule = {
      id: rule?.id,
      name: formData.name,
      description: formData.description || '',
      priority: formData.priority ?? 0,
      isActive: formData.isActive ?? true,
      canStack: formData.canStack ?? false,
      conditions: formData.conditions || {},
      outcome: formData.outcome,
    }

    onSave(savedRule)
    onOpenChange(false)
  }

  const outcomeType = (formData.outcome as any)?.type || 'ordinary'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Rule: {rule?.name || 'New Rule'}</DialogTitle>
          <DialogDescription>
            Configure rule conditions and outcomes
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="conditions">Conditions</TabsTrigger>
            <TabsTrigger value="outcome">Outcome</TabsTrigger>
          </TabsList>

          {/* ── Basic Info Tab ────────────────────────────── */}
          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Rule Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rule-name">Rule Name *</Label>
                  <Input
                    id="rule-name"
                    placeholder="e.g., Saturday Penalty"
                    value={formData.name || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rule-description">Description</Label>
                  <Textarea
                    id="rule-description"
                    placeholder="e.g., 30% penalty for work on Saturday"
                    value={formData.description || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rule-priority">Priority (0-100)</Label>
                    <Input
                      id="rule-priority"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.priority ?? 0}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                    />
                    <p className="text-xs text-muted-foreground">Higher priority rules apply first</p>
                  </div>

                  <div className="flex items-center justify-between pt-6">
                    <div className="space-y-0.5">
                      <Label>Active</Label>
                      <div className="text-xs text-muted-foreground">
                        Enable this rule
                      </div>
                    </div>
                    <Switch
                      checked={formData.isActive ?? true}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-6">
                    <div className="space-y-0.5">
                      <Label>Can Stack</Label>
                      <div className="text-xs text-muted-foreground">
                        Apply with other rules
                      </div>
                    </div>
                    <Switch
                      checked={formData.canStack ?? false}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, canStack: checked }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Conditions Tab ────────────────────────────── */}
          <TabsContent value="conditions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Rule Conditions</CardTitle>
                <CardDescription>
                  Leave empty for conditions that always apply
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Days of Week</Label>
                  <div className="flex flex-wrap gap-2">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                      <Button
                        key={day}
                        size="sm"
                        variant={
                          (formData.conditions as any)?.daysOfWeek?.includes(day)
                            ? 'default'
                            : 'outline'
                        }
                        onClick={() => {
                          const current = (formData.conditions as any)?.daysOfWeek || []
                          const updated = current.includes(day)
                            ? current.filter((d: string) => d !== day)
                            : [...current, day]
                          setFormData(prev => ({
                            ...prev,
                            conditions: {
                              ...((prev.conditions || {}) as any),
                              daysOfWeek: updated.length > 0 ? updated : undefined,
                            },
                          }))
                        }}
                        className="capitalize"
                      >
                        {day.slice(0, 3)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hours-min">Minimum Hours Worked</Label>
                    <Input
                      id="hours-min"
                      type="number"
                      placeholder="e.g., 8"
                      value={(formData.conditions as any)?.minHoursWorked ?? ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        conditions: {
                          ...((prev.conditions || {}) as any),
                          minHoursWorked: e.target.value ? parseFloat(e.target.value) : undefined,
                        },
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hours-after">After Hours Worked</Label>
                    <Input
                      id="hours-after"
                      type="number"
                      placeholder="e.g., 8"
                      value={(formData.conditions as any)?.afterHoursWorked ?? ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        conditions: {
                          ...((prev.conditions || {}) as any),
                          afterHoursWorked: e.target.value ? parseFloat(e.target.value) : undefined,
                        },
                      }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Required Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => (
                      <Button
                        key={tag.name}
                        size="sm"
                        variant={
                          (formData.conditions as any)?.requiredTags?.includes(tag.name)
                            ? 'default'
                            : 'outline'
                        }
                        onClick={() => {
                          const current = (formData.conditions as any)?.requiredTags || []
                          const updated = current.includes(tag.name)
                            ? current.filter((t: string) => t !== tag.name)
                            : [...current, tag.name]
                          setFormData(prev => ({
                            ...prev,
                            conditions: {
                              ...((prev.conditions || {}) as any),
                              requiredTags: updated.length > 0 ? updated : undefined,
                            },
                          }))
                        }}
                      >
                        {tag.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-0.5">
                    <Label>Public Holiday Only</Label>
                    <p className="text-xs text-muted-foreground">Apply only on public holidays</p>
                  </div>
                  <Switch
                    checked={(formData.conditions as any)?.isPublicHoliday ?? false}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      conditions: {
                        ...((prev.conditions || {}) as any),
                        isPublicHoliday: checked || undefined,
                      },
                    }))}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Outcome Tab ───────────────────────────────── */}
          <TabsContent value="outcome" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Rule Outcome</CardTitle>
                <CardDescription>
                  What happens when this rule applies
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="outcome-type">Outcome Type *</Label>
                  <Select
                    value={outcomeType}
                    onValueChange={(type) => {
                      setFormData(prev => ({
                        ...prev,
                        outcome: { type, exportName: (prev.outcome as any)?.exportName || '' } as any,
                      }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ordinary">Ordinary Time</SelectItem>
                      <SelectItem value="overtime">Overtime</SelectItem>
                      <SelectItem value="break">Break</SelectItem>
                      <SelectItem value="allowance">Allowance</SelectItem>
                      <SelectItem value="toil">TOIL</SelectItem>
                      <SelectItem value="leave">Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Ordinary & Overtime: Multiplier */}
                {(outcomeType === 'ordinary' || outcomeType === 'overtime') && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="multiplier">Rate Multiplier *</Label>
                      <Input
                        id="multiplier"
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="e.g., 1.5"
                        value={(formData.outcome as any)?.multiplier ?? ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          outcome: {
                            ...(prev.outcome as any),
                            multiplier: parseFloat(e.target.value) || 0,
                          },
                        }))}
                      />
                      <p className="text-xs text-muted-foreground">1.0 = standard rate, 1.5 = 50% increase</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="export-name">Export Name *</Label>
                      <Input
                        id="export-name"
                        placeholder="e.g., SAT 1.3x"
                        value={(formData.outcome as any)?.exportName ?? ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          outcome: {
                            ...(prev.outcome as any),
                            exportName: e.target.value,
                          },
                        }))}
                      />
                    </div>
                  </>
                )}

                {/* Break: Duration and Paid */}
                {outcomeType === 'break' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (minutes) *</Label>
                      <Input
                        id="duration"
                        type="number"
                        min="0"
                        placeholder="e.g., 30"
                        value={(formData.outcome as any)?.durationMinutes ?? ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          outcome: {
                            ...(prev.outcome as any),
                            durationMinutes: parseInt(e.target.value) || 0,
                          },
                        }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Paid Break</Label>
                        <p className="text-xs text-muted-foreground">Is this break paid?</p>
                      </div>
                      <Switch
                        checked={(formData.outcome as any)?.isPaid ?? false}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          outcome: {
                            ...(prev.outcome as any),
                            isPaid: checked,
                          },
                        }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="break-name">Export Name *</Label>
                      <Input
                        id="break-name"
                        placeholder="e.g., BREAK-MEAL"
                        value={(formData.outcome as any)?.exportName ?? ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          outcome: {
                            ...(prev.outcome as any),
                            exportName: e.target.value,
                          },
                        }))}
                      />
                    </div>
                  </>
                )}

                {/* Allowance: Flat Rate */}
                {outcomeType === 'allowance' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="flat-rate">Flat Rate ($) *</Label>
                      <Input
                        id="flat-rate"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="e.g., 5.00"
                        value={(formData.outcome as any)?.flatRate ?? ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          outcome: {
                            ...(prev.outcome as any),
                            flatRate: parseFloat(e.target.value) || 0,
                          },
                        }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="allow-name">Export Name *</Label>
                      <Input
                        id="allow-name"
                        placeholder="e.g., ALLOW-NIGHT"
                        value={(formData.outcome as any)?.exportName ?? ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          outcome: {
                            ...(prev.outcome as any),
                            exportName: e.target.value,
                          },
                        }))}
                      />
                    </div>
                  </>
                )}

                {/* TOIL: Accrual Multiplier */}
                {outcomeType === 'toil' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="toil-mult">TOIL Accrual Multiplier *</Label>
                      <Input
                        id="toil-mult"
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="e.g., 1.5"
                        value={(formData.outcome as any)?.accrualMultiplier ?? ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          outcome: {
                            ...(prev.outcome as any),
                            accrualMultiplier: parseFloat(e.target.value) || 0,
                          },
                        }))}
                      />
                      <p className="text-xs text-muted-foreground">1.0 = 1:1 accrual, 1.5 = 1.5 hours TOIL per hour</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="toil-name">Export Name *</Label>
                      <Input
                        id="toil-name"
                        placeholder="e.g., TOIL 1.5x"
                        value={(formData.outcome as any)?.exportName ?? ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          outcome: {
                            ...(prev.outcome as any),
                            exportName: e.target.value,
                          },
                        }))}
                      />
                    </div>
                  </>
                )}

                {/* Leave: Accrual Rate */}
                {outcomeType === 'leave' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="leave-rate">Accrual Rate (hrs/hr worked) *</Label>
                      <Input
                        id="leave-rate"
                        type="number"
                        step="0.0001"
                        min="0"
                        placeholder="e.g., 0.0769"
                        value={(formData.outcome as any)?.accrualRate ?? ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          outcome: {
                            ...(prev.outcome as any),
                            accrualRate: parseFloat(e.target.value) || 0,
                          },
                        }))}
                      />
                      <p className="text-xs text-muted-foreground">0.0769 = 4 weeks per year (38hr week)</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="leave-type">Leave Type *</Label>
                      <Select
                        value={(formData.outcome as any)?.leaveType || 'annual'}
                        onValueChange={(type) => setFormData(prev => ({
                          ...prev,
                          outcome: {
                            ...(prev.outcome as any),
                            leaveType: type,
                          },
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="annual">Annual Leave</SelectItem>
                          <SelectItem value="sick">Sick Leave</SelectItem>
                          <SelectItem value="personal">Personal Leave</SelectItem>
                          <SelectItem value="long-service">Long Service Leave</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="leave-name">Export Name *</Label>
                      <Input
                        id="leave-name"
                        placeholder="e.g., LEAVE-ANNUAL"
                        value={(formData.outcome as any)?.exportName ?? ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          outcome: {
                            ...(prev.outcome as any),
                            exportName: e.target.value,
                          },
                        }))}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !formData.name}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Clock className="h-4 w-4 mr-2" />
            )}
            {saving ? 'Saving...' : 'Save Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
