"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, X, Save } from "lucide-react"
import { Award, AwardRule, AwardTag } from "@/lib/validations/awards"

interface CreateAwardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: (award: Award) => void
}

export function CreateAwardDialog({ open, onOpenChange, onSave }: CreateAwardDialogProps) {
  const [formData, setFormData] = useState<Partial<Award>>({
    name: "",
    description: "",
    rules: [],
    availableTags: [],
    isActive: true,
    version: "1.0.0"
  })

  const [newTag, setNewTag] = useState<Partial<AwardTag>>({
    name: "TOIL",
    description: "",
    overridesBehavior: "modify"
  })

  const handleSave = () => {
    if (!formData.name) return
    
    const award: Award = {
      name: formData.name,
      description: formData.description || "",
      rules: formData.rules || [],
      availableTags: formData.availableTags || [],
      isActive: formData.isActive ?? true,
      version: formData.version || "1.0.0"
    }
    
    onSave?.(award)
    onOpenChange(false)
    
    // Reset form
    setFormData({
      name: "",
      description: "",
      rules: [],
      availableTags: [],
      isActive: true,
      version: "1.0.0"
    })
  }

  const addTag = () => {
    if (!newTag.name || !newTag.description) return
    
    const tag: AwardTag = {
      name: newTag.name as any,
      description: newTag.description,
      overridesBehavior: newTag.overridesBehavior || "modify"
    }
    
    setFormData(prev => ({
      ...prev,
      availableTags: [...(prev.availableTags || []), tag]
    }))
    
    setNewTag({
      name: "TOIL",
      description: "",
      overridesBehavior: "modify"
    })
  }

  const removeTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      availableTags: prev.availableTags?.filter((_, i) => i !== index) || []
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Award</DialogTitle>
          <DialogDescription>
            Create a new award with rules, tags, and penalty rates
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Award Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Retail Award 2024"
                  value={formData.name || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of this award..."
                  value={formData.description || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Active Award</Label>
                  <div className="text-sm text-muted-foreground">
                    Enable this award for use in timesheet processing
                  </div>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  placeholder="1.0.0"
                  value={formData.version || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Award Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Award Tags</CardTitle>
              <CardDescription>
                Tags allow manual overrides of automatic rule processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing Tags */}
              {formData.availableTags && formData.availableTags.length > 0 && (
                <div className="space-y-2">
                  <Label>Current Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {formData.availableTags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {tag.name}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => removeTag(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Tag */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tag Type</Label>
                  <Select
                    value={newTag.name}
                    onValueChange={(value) => setNewTag(prev => ({ ...prev, name: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TOIL">TOIL</SelectItem>
                      <SelectItem value="BrokenShift">Broken Shift</SelectItem>
                      <SelectItem value="PublicHolidayOverride">Public Holiday Override</SelectItem>
                      <SelectItem value="ReturnToDuty">Return to Duty</SelectItem>
                      <SelectItem value="SickLeave">Sick Leave</SelectItem>
                      <SelectItem value="AnnualLeave">Annual Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Override Behavior</Label>
                  <Select
                    value={newTag.overridesBehavior}
                    onValueChange={(value) => setNewTag(prev => ({ ...prev, overridesBehavior: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="modify">Modify</SelectItem>
                      <SelectItem value="replace">Replace</SelectItem>
                      <SelectItem value="disable">Disable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="Tag description..."
                    value={newTag.description || ""}
                    onChange={(e) => setNewTag(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={addTag}
                disabled={!newTag.name || !newTag.description}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Tag
              </Button>
            </CardContent>
          </Card>

          {/* Rules Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Award Rules</CardTitle>
              <CardDescription>
                Rules will be added after creating the award. You can add ordinary time, overtime, allowances, and break rules.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Rules can be added after creating the award</p>
                <p className="text-sm">Use the "Edit Award" dialog to add and configure rules</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!formData.name}>
            <Save className="h-4 w-4 mr-2" />
            Create Award
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}