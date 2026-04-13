"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Plus, Pencil, Trash2, Loader2, Save, AlertCircle } from "lucide-react"

type PayrollSystemType = 'xero' | 'myob' | 'apa' | 'custom'

interface RuleMapping {
  exportName: string
  payrollCode: string
  description: string
}

interface PayItemMapping {
  type: 'pay' | 'deduction' | 'leave_accrual'
  exportName: string
  payrollCode: string
  description: string
}

interface BreakMapping {
  breakType: string
  exportName: string
  payrollCode: string
}

interface PayrollMappingData {
  _id: string
  payrollSystemType: PayrollSystemType
  ruleMapping: RuleMapping[]
  payItemMapping: PayItemMapping[]
  breakMapping: BreakMapping[]
  isDefault: boolean
  notes?: string
}

interface PayrollMappingConfigProps {
  tenantId: string
  onClose?: () => void
}

const SYSTEM_LABELS: Record<PayrollSystemType, string> = {
  xero: 'Xero',
  myob: 'MYOB',
  apa: 'APA (STP)',
  custom: 'Custom'
}

export function PayrollMappingConfig({ tenantId, onClose }: PayrollMappingConfigProps) {
  const [systemType, setSystemType] = useState<PayrollSystemType>('xero')
  const [mappings, setMappings] = useState<PayrollMappingData[]>([])
  const [selectedMapping, setSelectedMapping] = useState<PayrollMappingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Editable state
  const [ruleMappings, setRuleMappings] = useState<RuleMapping[]>([])
  const [payItemMappings, setPayItemMappings] = useState<PayItemMapping[]>([])
  const [breakMappings, setBreakMappings] = useState<BreakMapping[]>([])
  const [isDefault, setIsDefault] = useState(false)
  const [notes, setNotes] = useState('')

  // Dialog state
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false)
  const [payItemDialogOpen, setPayItemDialogOpen] = useState(false)
  const [breakDialogOpen, setBreakDialogOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  // Dialog form state
  const [dialogForm, setDialogForm] = useState<Record<string, string>>({})

  const fetchMappings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/payroll/mappings?payrollSystemType=${systemType}`)
      if (res.ok) {
        const data = await res.json()
        setMappings(data.mappings || [])
        const defaultMapping = (data.mappings || []).find((m: PayrollMappingData) => m.isDefault)
        if (defaultMapping) {
          selectMapping(defaultMapping)
        } else if (data.mappings?.length > 0) {
          selectMapping(data.mappings[0])
        } else {
          setSelectedMapping(null)
          resetForm()
        }
      }
    } catch {
      console.error("Failed to fetch mappings")
    } finally {
      setLoading(false)
    }
  }, [systemType])

  useEffect(() => {
    fetchMappings()
  }, [fetchMappings])

  function selectMapping(mapping: PayrollMappingData) {
    setSelectedMapping(mapping)
    setRuleMappings([...mapping.ruleMapping])
    setPayItemMappings([...mapping.payItemMapping])
    setBreakMappings([...mapping.breakMapping])
    setIsDefault(mapping.isDefault)
    setNotes(mapping.notes || '')
  }

  function resetForm() {
    setRuleMappings([])
    setPayItemMappings([])
    setBreakMappings([])
    setIsDefault(false)
    setNotes('')
  }

  async function handleSave() {
    setSaving(true)
    try {
      const body = {
        payrollSystemType: systemType,
        ruleMapping: ruleMappings,
        payItemMapping: payItemMappings,
        breakMapping: breakMappings,
        isDefault,
        notes: notes || undefined
      }

      const url = selectedMapping
        ? `/api/payroll/mappings/${selectedMapping._id}`
        : '/api/payroll/mappings'

      const res = await fetch(url, {
        method: selectedMapping ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        fetchMappings()
      }
    } catch {
      console.error("Failed to save mapping")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selectedMapping || selectedMapping.isDefault) return
    try {
      const res = await fetch(`/api/payroll/mappings/${selectedMapping._id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setSelectedMapping(null)
        resetForm()
        fetchMappings()
      }
    } catch {
      console.error("Failed to delete mapping")
    }
  }

  // Rule mapping dialog handlers
  function openRuleDialog(index?: number) {
    if (index !== undefined) {
      setEditingIndex(index)
      setDialogForm({
        exportName: ruleMappings[index].exportName,
        payrollCode: ruleMappings[index].payrollCode,
        description: ruleMappings[index].description
      })
    } else {
      setEditingIndex(null)
      setDialogForm({ exportName: '', payrollCode: '', description: '' })
    }
    setRuleDialogOpen(true)
  }

  function saveRuleDialog() {
    const entry: RuleMapping = {
      exportName: dialogForm.exportName || '',
      payrollCode: dialogForm.payrollCode || '',
      description: dialogForm.description || ''
    }
    if (editingIndex !== null) {
      const updated = [...ruleMappings]
      updated[editingIndex] = entry
      setRuleMappings(updated)
    } else {
      setRuleMappings([...ruleMappings, entry])
    }
    setRuleDialogOpen(false)
  }

  function deleteRule(index: number) {
    setRuleMappings(ruleMappings.filter((_, i) => i !== index))
  }

  // Pay item mapping dialog handlers
  function openPayItemDialog(index?: number) {
    if (index !== undefined) {
      setEditingIndex(index)
      setDialogForm({
        type: payItemMappings[index].type,
        exportName: payItemMappings[index].exportName,
        payrollCode: payItemMappings[index].payrollCode,
        description: payItemMappings[index].description
      })
    } else {
      setEditingIndex(null)
      setDialogForm({ type: 'pay', exportName: '', payrollCode: '', description: '' })
    }
    setPayItemDialogOpen(true)
  }

  function savePayItemDialog() {
    const entry: PayItemMapping = {
      type: dialogForm.type as PayItemMapping['type'] || 'pay',
      exportName: dialogForm.exportName || '',
      payrollCode: dialogForm.payrollCode || '',
      description: dialogForm.description || ''
    }
    if (editingIndex !== null) {
      const updated = [...payItemMappings]
      updated[editingIndex] = entry
      setPayItemMappings(updated)
    } else {
      setPayItemMappings([...payItemMappings, entry])
    }
    setPayItemDialogOpen(false)
  }

  function deletePayItem(index: number) {
    setPayItemMappings(payItemMappings.filter((_, i) => i !== index))
  }

  // Break mapping dialog handlers
  function openBreakDialog(index?: number) {
    if (index !== undefined) {
      setEditingIndex(index)
      setDialogForm({
        breakType: breakMappings[index].breakType,
        exportName: breakMappings[index].exportName,
        payrollCode: breakMappings[index].payrollCode
      })
    } else {
      setEditingIndex(null)
      setDialogForm({ breakType: 'meal', exportName: '', payrollCode: '' })
    }
    setBreakDialogOpen(true)
  }

  function saveBreakDialog() {
    const entry: BreakMapping = {
      breakType: dialogForm.breakType || 'meal',
      exportName: dialogForm.exportName || '',
      payrollCode: dialogForm.payrollCode || ''
    }
    if (editingIndex !== null) {
      const updated = [...breakMappings]
      updated[editingIndex] = entry
      setBreakMappings(updated)
    } else {
      setBreakMappings([...breakMappings, entry])
    }
    setBreakDialogOpen(false)
  }

  function deleteBreak(index: number) {
    setBreakMappings(breakMappings.filter((_, i) => i !== index))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* System Type Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payroll System</CardTitle>
          <CardDescription>Choose the payroll system to configure mappings for</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select
              value={systemType}
              onValueChange={(v) => setSystemType(v as PayrollSystemType)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="xero">Xero</SelectItem>
                <SelectItem value="myob">MYOB</SelectItem>
                <SelectItem value="apa">APA (STP)</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            {selectedMapping && (
              <Badge variant={selectedMapping.isDefault ? "default" : "outline"}>
                {selectedMapping.isDefault ? 'Default' : 'Not Default'}
              </Badge>
            )}

            {mappings.length > 1 && (
              <Select
                value={selectedMapping?._id || ''}
                onValueChange={(id) => {
                  const m = mappings.find(m => m._id === id)
                  if (m) selectMapping(m)
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select mapping..." />
                </SelectTrigger>
                <SelectContent>
                  {mappings.map(m => (
                    <SelectItem key={m._id} value={m._id}>
                      {SYSTEM_LABELS[m.payrollSystemType]} {m.isDefault ? '(Default)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {mappings.length === 0 && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              No mappings found for {SYSTEM_LABELS[systemType]}. Configure one below.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rule Mapping Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Rule Mappings</CardTitle>
              <CardDescription>Map award export names to payroll system codes</CardDescription>
            </div>
            <Button size="sm" onClick={() => openRuleDialog()}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {ruleMappings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No rule mappings configured</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Export Name</TableHead>
                  <TableHead>Payroll Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {ruleMappings.map((rule, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-sm">{rule.exportName}</TableCell>
                    <TableCell className="font-mono text-sm">{rule.payrollCode}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{rule.description}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openRuleDialog(i)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRule(i)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pay Item Mapping Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Pay Item Mappings</CardTitle>
              <CardDescription>Map pay item types to payroll codes</CardDescription>
            </div>
            <Button size="sm" onClick={() => openPayItemDialog()}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {payItemMappings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No pay item mappings configured</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Export Name</TableHead>
                  <TableHead>Payroll Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {payItemMappings.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{item.type.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.exportName}</TableCell>
                    <TableCell className="font-mono text-sm">{item.payrollCode}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.description}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openPayItemDialog(i)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deletePayItem(i)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Break Mapping Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Break Mappings</CardTitle>
              <CardDescription>Map break types to payroll codes</CardDescription>
            </div>
            <Button size="sm" onClick={() => openBreakDialog()}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {breakMappings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No break mappings configured</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Break Type</TableHead>
                  <TableHead>Export Name</TableHead>
                  <TableHead>Payroll Code</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakMappings.map((brk, i) => (
                  <TableRow key={i}>
                    <TableCell className="capitalize">{brk.breakType}</TableCell>
                    <TableCell className="font-mono text-sm">{brk.exportName}</TableCell>
                    <TableCell className="font-mono text-sm">{brk.payrollCode}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openBreakDialog(i)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteBreak(i)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Default Mapping</Label>
              <p className="text-xs text-muted-foreground">Use this mapping by default when exporting to {SYSTEM_LABELS[systemType]}</p>
            </div>
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this mapping configuration..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {onClose && (
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          )}
          {selectedMapping && !selectedMapping.isDefault && (
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          )}
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-1" />
          )}
          {selectedMapping ? 'Update Mapping' : 'Create Mapping'}
        </Button>
      </div>

      {/* Rule Mapping Dialog */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingIndex !== null ? 'Edit' : 'Add'} Rule Mapping</DialogTitle>
            <DialogDescription>
              Map an award export name to a {SYSTEM_LABELS[systemType]} payroll code
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Export Name</Label>
              <Input
                placeholder='e.g. "OT 1.5x", "SAT 1.3x"'
                value={dialogForm.exportName || ''}
                onChange={(e) => setDialogForm({ ...dialogForm, exportName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Payroll Code</Label>
              <Input
                placeholder={systemType === 'apa' ? 'e.g. "0401"' : 'e.g. "OVERTIME1.5"'}
                value={dialogForm.payrollCode || ''}
                onChange={(e) => setDialogForm({ ...dialogForm, payrollCode: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Optional description"
                value={dialogForm.description || ''}
                onChange={(e) => setDialogForm({ ...dialogForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={saveRuleDialog}
              disabled={!dialogForm.exportName || !dialogForm.payrollCode}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Item Dialog */}
      <Dialog open={payItemDialogOpen} onOpenChange={setPayItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingIndex !== null ? 'Edit' : 'Add'} Pay Item Mapping</DialogTitle>
            <DialogDescription>
              Map a pay item type to a {SYSTEM_LABELS[systemType]} payroll code
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={dialogForm.type || 'pay'}
                onValueChange={(v) => setDialogForm({ ...dialogForm, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pay">Pay</SelectItem>
                  <SelectItem value="deduction">Deduction</SelectItem>
                  <SelectItem value="leave_accrual">Leave Accrual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Export Name</Label>
              <Input
                placeholder='e.g. "TOIL 1.5x", "ANNUAL-LEAVE"'
                value={dialogForm.exportName || ''}
                onChange={(e) => setDialogForm({ ...dialogForm, exportName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Payroll Code</Label>
              <Input
                placeholder="Payroll system code"
                value={dialogForm.payrollCode || ''}
                onChange={(e) => setDialogForm({ ...dialogForm, payrollCode: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Optional description"
                value={dialogForm.description || ''}
                onChange={(e) => setDialogForm({ ...dialogForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayItemDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={savePayItemDialog}
              disabled={!dialogForm.exportName || !dialogForm.payrollCode}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Break Dialog */}
      <Dialog open={breakDialogOpen} onOpenChange={setBreakDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingIndex !== null ? 'Edit' : 'Add'} Break Mapping</DialogTitle>
            <DialogDescription>
              Map a break type to a {SYSTEM_LABELS[systemType]} payroll code
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Break Type</Label>
              <Select
                value={dialogForm.breakType || 'meal'}
                onValueChange={(v) => setDialogForm({ ...dialogForm, breakType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meal">Meal</SelectItem>
                  <SelectItem value="rest">Rest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Export Name</Label>
              <Input
                placeholder='e.g. "BREAK-MEAL"'
                value={dialogForm.exportName || ''}
                onChange={(e) => setDialogForm({ ...dialogForm, exportName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Payroll Code</Label>
              <Input
                placeholder="Payroll system code"
                value={dialogForm.payrollCode || ''}
                onChange={(e) => setDialogForm({ ...dialogForm, payrollCode: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBreakDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={saveBreakDialog}
              disabled={!dialogForm.exportName || !dialogForm.payrollCode}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
