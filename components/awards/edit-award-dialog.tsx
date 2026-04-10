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
import { Plus, X, Save, Edit, Trash2, Clock, DollarSign, Coffee, Calendar } from "lucide-react"
import { Award, AwardRule, AwardTag } from "@/lib/validations/awards"

interface EditAwardDialogProps {
  award: any // Mock award data
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: (award: Award) => void
}

export function EditAwardDialog({ award, open, onOpenChange, onSave }: EditAwardDialogProps) {
  const [formData, setFormData] = useState<Partial<Award>>({})
  const [selectedRule, setSelectedRule] = useState<AwardRule | null>(null)
  const [showRuleForm, setShowRuleForm] = useState(false)

  useEffect(() => {
    if (award) {
      setFormData({
        name: award.name,
        description: award.description,
        rules: award.rules || [],
        availableTags: award.availableTags || [],
        isActive: award.isActive,
        version: award.version
      })
    }
  }, [award])

  const handleSave = () => {
    if (!formData.name) return
    
    const updatedAward: Award = {
      name: formData.name,
      description: formData.description || "",
      rules: formData.rules || [],
      availableTags: formData.availableTags || [],
      isActive: formData.isActive ?? true,
      version: formData.version || "1.0.0"
    }
    
    onSave?.(updatedAward)
    onOpenChange(false)
  }

  const mockRules = [
    {
      id: "1",
      name: "Ordinary Time",
      description: "Standard 1x rate for regular hours",
      priority: 1,
      isActive: true,
      canStack: false,
      conditions: {},
      outcome: {
        type: "ordinary" as const,
        multiplier: 1.0,
        description: "Standard rate"
      }
    },
    {
      id: "2", 
      name: "Daily Overtime",
      description: "1.5x rate after 8 hours daily",
      priority: 10,
      isActive: true,
      canStack: false,
      conditions: {
        afterHoursWorked: 8
      },
      outcome: {
        type: "overtime" as const,
        multiplier: 1.5,
        description: "Daily overtime"
      }
    },
    {
      id: "3",
      name: "Weekend Premium",
      description: "1.25x rate for weekend work",
      priority: 15,
      isActive: true,
      canStack: false,
      conditions: {
        daysOfWeek: ["saturday", "sunday"]
      },
      outcome: {
        type: "overtime" as const,
        multiplier: 1.25,
        description: "Weekend penalty"
      }
    },
    {
      id: "4",
      name: "Meal Break",
      description: "30 minute unpaid break for 5+ hour shifts",
      priority: 5,
      isActive: true,
      canStack: false,
      conditions: {
        minHoursWorked: 5
      },
      outcome: {
        type: "break" as const,
        durationMinutes: 30,
        isPaid: false,
        isAutomatic: true,
        description: "Meal break"
      }
    }
  ]

  const getRuleIcon = (ruleType: string) => {
    switch (ruleType) {
      case "ordinary":
        return <Clock className="h-4 w-4" />
      case "overtime":
        return <DollarSign className="h-4 w-4" />
      case "break":
        return <Coffee className="h-4 w-4" />
      case "allowance":
        return <DollarSign className="h-4 w-4" />
      case "toil":
        return <Calendar className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getRuleTypeColor = (ruleType: string) => {
    switch (ruleType) {
      case "ordinary":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
      case "overtime":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
      case "break":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300"
      case "allowance":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
      case "toil":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Award: {award?.name}</DialogTitle>
          <DialogDescription>
            Modify award settings, rules, and available tags
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="rules">Rules ({mockRules.length})</TabsTrigger>
            <TabsTrigger value="tags">Tags</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Award Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Award Name *</Label>
                  <Input
                    id="name"
                    value={formData.name || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="version">Version</Label>
                    <Input
                      id="version"
                      value={formData.version || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Active</Label>
                      <div className="text-sm text-muted-foreground">
                        Enable for timesheet processing
                      </div>
                    </div>
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Award Rules</CardTitle>
                  <CardDescription>
                    Configure penalty rates, overtime, breaks, and allowances
                  </CardDescription>
                </div>
                <Button onClick={() => setShowRuleForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockRules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${getRuleTypeColor(rule.outcome.type)}`}>
                          {getRuleIcon(rule.outcome.type)}
                        </div>
                        <div>
                          <div className="font-medium">{rule.name}</div>
                          <div className="text-sm text-muted-foreground">{rule.description}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              Priority: {rule.priority}
                            </Badge>
                            {rule.outcome.type === "overtime" && (
                              <Badge variant="secondary" className="text-xs">
                                {rule.outcome.multiplier}x rate
                              </Badge>
                            )}
                            {rule.outcome.type === "break" && (
                              <Badge variant="secondary" className="text-xs">
                                {rule.outcome.durationMinutes}min {rule.outcome.isPaid ? "paid" : "unpaid"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={rule.isActive} />
                        <Button size="sm" variant="outline">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {showRuleForm && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-lg">Add New Rule</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Rule creation form would go here</p>
                        <p className="text-sm">This would include rule type selection, conditions, and outcomes</p>
                        <div className="flex gap-2 justify-center mt-4">
                          <Button variant="outline" onClick={() => setShowRuleForm(false)}>
                            Cancel
                          </Button>
                          <Button onClick={() => setShowRuleForm(false)}>
                            Save Rule
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tags" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Available Award Tags</CardTitle>
                <CardDescription>
                  Tags allow manual overrides of automatic rule processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {award?.availableTags?.map((tag: string, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Badge variant="secondary">{tag}</Badge>
                        <div className="text-sm text-muted-foreground mt-1">
                          Manual override tag for special circumstances
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No tags configured</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}