"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Edit, Trash2, Search, AlertCircle, Loader2, Lock } from "lucide-react"
import { EditRuleForm } from "./edit-rule-form"
import { AwardRule } from "@/lib/validations/awards"

interface RuleTemplate extends AwardRule {
  _id: string
  category?: string
  isDefault?: boolean
}

export function RuleEngineTab() {
  const [templates, setTemplates] = useState<RuleTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  // Rule form state
  const [selectedRule, setSelectedRule] = useState<RuleTemplate | null>(null)
  const [ruleFormOpen, setRuleFormOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    fetchTemplates()
  }, [searchTerm, categoryFilter])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (searchTerm) params.append("search", searchTerm)
      if (categoryFilter) params.append("category", categoryFilter)

      const res = await fetch(`/api/rule-templates?${params}`)
      if (!res.ok) throw new Error("Failed to fetch templates")

      const data = await res.json()
      setTemplates(data.templates || [])
    } catch (err: any) {
      setError(err.message)
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTemplate = async (id: string, isDefault: boolean) => {
    if (isDefault) {
      alert("Cannot delete default templates")
      return
    }

    if (!confirm("Delete this template?")) return

    try {
      const res = await fetch(`/api/rule-templates/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete template")
      fetchTemplates()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleSaveRule = async (rule: AwardRule) => {
    try {
      if (isCreating) {
        // Create new template
        const res = await fetch("/api/rule-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rule),
        })
        if (!res.ok) throw new Error("Failed to create template")
      } else if (selectedRule?._id) {
        // Update existing template
        const res = await fetch(`/api/rule-templates/${selectedRule._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rule),
        })
        if (!res.ok) throw new Error("Failed to update template")
      }

      setRuleFormOpen(false)
      setSelectedRule(null)
      setIsCreating(false)
      fetchTemplates()
    } catch (err: any) {
      alert(err.message)
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

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case "ordinary":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
      case "overtime":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300"
      case "break":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300"
      case "allowance":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
      case "toil":
        return "bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-300"
      case "leave":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Select value={categoryFilter || "all"} onValueChange={(val) => setCategoryFilter(val === "all" ? null : val)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="ordinary">Ordinary Time</SelectItem>
            <SelectItem value="overtime">Overtime</SelectItem>
            <SelectItem value="break">Breaks</SelectItem>
            <SelectItem value="allowance">Allowances</SelectItem>
            <SelectItem value="toil">TOIL</SelectItem>
            <SelectItem value="leave">Leave</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={() => {
          setSelectedRule(null)
          setIsCreating(true)
          setRuleFormOpen(true)
        }}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Templates Table */}
      {!loading && templates.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead className="text-right">Priority</TableHead>
                <TableHead className="text-right">Conditions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => {
                const outcomeType = (template.outcome as any)?.type || "ordinary"
                const outcomeSummary = getOutcomeSummary(template.outcome)
                const conditionCount = Object.keys((template.conditions || {}) as any).filter(
                  (k) => (template.conditions as any)[k] !== undefined
                ).length

                return (
                  <TableRow key={template._id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{template.name}</div>
                        {template.description && (
                          <div className="text-xs text-muted-foreground">{template.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {template.category && (
                        <Badge className={getCategoryColor(template.category)} variant="outline">
                          {template.category.replace("_", " ").charAt(0).toUpperCase() + template.category.slice(1)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {outcomeSummary && (
                        <Badge variant="secondary" className="text-xs">
                          {outcomeSummary}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{template.priority ?? 0}</TableCell>
                    <TableCell className="text-right">{conditionCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {template.isDefault && (
                          <span title="Default template (read-only)" aria-label="Default template (read-only)">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={template.isDefault}
                          onClick={() => {
                            setSelectedRule(template)
                            setIsCreating(false)
                            setRuleFormOpen(true)
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10"
                          disabled={template.isDefault}
                          onClick={() => handleDeleteTemplate(template._id, template.isDefault || false)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Empty State */}
      {!loading && templates.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base font-semibold">No templates found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchTerm || categoryFilter
              ? "Try adjusting your search or filters"
              : "Create your first rule template to get started"}
          </p>
        </div>
      )}

      {/* Edit Rule Form */}
      {ruleFormOpen && (
        <EditRuleForm
          rule={selectedRule || null}
          open={ruleFormOpen}
          onOpenChange={setRuleFormOpen}
          onSave={handleSaveRule}
          availableTags={[]}
        />
      )}
    </div>
  )
}
