"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, DollarSign, Coffee, Calendar, CheckCircle, XCircle, Users, Tag } from "lucide-react"

interface ViewAwardDialogProps {
  award: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ViewAwardDialog({ award, open, onOpenChange }: ViewAwardDialogProps) {
  if (!award) return null

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
    },
    {
      id: "5",
      name: "Night Shift Allowance",
      description: "$25 allowance for shifts starting after 10 PM",
      priority: 8,
      isActive: true,
      canStack: true,
      conditions: {
        timeRange: { start: 22, end: 6 }
      },
      outcome: {
        type: "allowance" as const,
        flatRate: 25,
        currency: "AUD",
        description: "Night shift allowance"
      }
    },
    {
      id: "6",
      name: "TOIL Accrual",
      description: "Accrue TOIL instead of overtime when tagged",
      priority: 25,
      isActive: true,
      canStack: false,
      conditions: {
        requiredTags: ["TOIL"],
        afterHoursWorked: 8
      },
      outcome: {
        type: "toil" as const,
        accrualMultiplier: 1.5,
        maxBalance: 76,
        expiryDays: 365,
        description: "TOIL accrual"
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

  const formatConditions = (conditions: any) => {
    const parts = []
    
    if (conditions.daysOfWeek) {
      parts.push(`Days: ${conditions.daysOfWeek.join(", ")}`)
    }
    
    if (conditions.timeRange) {
      parts.push(`Time: ${conditions.timeRange.start}:00 - ${conditions.timeRange.end}:00`)
    }
    
    if (conditions.afterHoursWorked) {
      parts.push(`After ${conditions.afterHoursWorked} hours worked`)
    }
    
    if (conditions.minHoursWorked) {
      parts.push(`Min ${conditions.minHoursWorked} hours`)
    }
    
    if (conditions.weeklyHoursThreshold) {
      parts.push(`After ${conditions.weeklyHoursThreshold} weekly hours`)
    }
    
    if (conditions.employmentTypes) {
      parts.push(`Employment: ${conditions.employmentTypes.join(", ")}`)
    }
    
    if (conditions.requiredTags) {
      parts.push(`Requires tags: ${conditions.requiredTags.join(", ")}`)
    }
    
    if (conditions.excludedTags) {
      parts.push(`Excludes tags: ${conditions.excludedTags.join(", ")}`)
    }
    
    if (conditions.isPublicHoliday) {
      parts.push("Public holidays only")
    }
    
    if (conditions.outsideRoster) {
      parts.push("Outside rostered hours")
    }
    
    return parts.length > 0 ? parts.join(" • ") : "Always applies"
  }

  const formatOutcome = (outcome: any) => {
    switch (outcome.type) {
      case "ordinary":
        return `${outcome.multiplier}x standard rate`
      case "overtime":
        return `${outcome.multiplier}x overtime rate`
      case "allowance":
        return `$${outcome.flatRate} ${outcome.currency || "AUD"} allowance`
      case "break":
        return `${outcome.durationMinutes}min ${outcome.isPaid ? "paid" : "unpaid"} break`
      case "toil":
        return `${outcome.accrualMultiplier}x TOIL accrual (max ${outcome.maxBalance}h)`
      case "leave":
        return `${outcome.accrualRate}x ${outcome.leaveType} leave accrual`
      default:
        return "Unknown outcome"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">{award.name}</DialogTitle>
              <DialogDescription className="mt-1">
                {award.description}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={award.isActive ? "default" : "secondary"}>
                {award.isActive ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 mr-1" />
                    Inactive
                  </>
                )}
              </Badge>
              <Badge variant="outline">v{award.version}</Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="rules">Rules ({mockRules.length})</TabsTrigger>
            <TabsTrigger value="tags">Tags</TabsTrigger>
            <TabsTrigger value="specificity">Rule Specificity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Rules
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{mockRules.length}</div>
                  <div className="text-sm text-muted-foreground">
                    {mockRules.filter(r => r.isActive).length} active
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Tags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{award.availableTags?.length || 0}</div>
                  <div className="text-sm text-muted-foreground">
                    Available overrides
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Coverage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">All</div>
                  <div className="text-sm text-muted-foreground">
                    Employment types
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Award Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Created</Label>
                    <div className="text-sm text-muted-foreground">
                      {new Date(award.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Last Updated</Label>
                    <div className="text-sm text-muted-foreground">
                      {new Date(award.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <div className="text-sm text-muted-foreground mt-1">
                    {award.description || "No description provided"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Award Rules</CardTitle>
                <CardDescription>
                  All rules configured for this award, ordered by priority
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockRules
                    .sort((a, b) => b.priority - a.priority)
                    .map((rule) => (
                    <div key={rule.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${getRuleTypeColor(rule.outcome.type)}`}>
                            {getRuleIcon(rule.outcome.type)}
                          </div>
                          <div>
                            <div className="font-medium">{rule.name}</div>
                            <div className="text-sm text-muted-foreground">{rule.description}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Priority: {rule.priority}
                          </Badge>
                          <Badge variant={rule.isActive ? "default" : "secondary"} className="text-xs">
                            {rule.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">CONDITIONS</Label>
                          <div className="text-sm mt-1">
                            {formatConditions(rule.conditions)}
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">OUTCOME</Label>
                          <div className="text-sm mt-1">
                            {formatOutcome(rule.outcome)}
                          </div>
                        </div>

                        {rule.canStack && (
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              Can Stack
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tags" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Available Award Tags</CardTitle>
                <CardDescription>
                  Tags that can be applied to shifts to override automatic rule processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {award.availableTags?.map((tag: string, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <Badge variant="secondary">{tag}</Badge>
                          <div className="text-sm text-muted-foreground mt-1">
                            Manual override tag for special circumstances
                          </div>
                        </div>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-muted-foreground">
                      <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No tags configured</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="specificity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Rule Specificity Engine</CardTitle>
                <CardDescription>
                  How rules compete against each other - most specific rule wins
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">How Rule Specificity Works</h4>
                    <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <p>• Rules with more conditions are more specific</p>
                      <p>• More specific rules override less specific ones</p>
                      <p>• If specificity is equal, higher priority wins</p>
                      <p>• Award tags can force specific rule paths</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Example Rule Competition</Label>
                    <div className="space-y-2">
                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Rule A: General Overtime</span>
                          <Badge variant="outline">Specificity: 15</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">After 8 hours daily</div>
                      </div>
                      
                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Rule B: Weekend Work</span>
                          <Badge variant="outline">Specificity: 20</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">Saturday/Sunday only</div>
                      </div>
                      
                      <div className="p-3 border-2 border-green-200 bg-green-50 rounded-lg dark:bg-green-900/20 dark:border-green-800">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-green-800 dark:text-green-200">Rule C: Weekend Evening</span>
                          <Badge variant="default" className="bg-green-600 dark:bg-green-700">Specificity: 35 (WINS)</Badge>
                        </div>
                        <div className="text-sm text-green-700 dark:text-green-300">Saturday/Sunday + after 6 PM</div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      For a Saturday 7 PM shift, Rule C wins because it has the highest specificity (day + time conditions).
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>
}