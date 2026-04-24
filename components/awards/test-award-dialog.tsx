"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Play, Clock, DollarSign, Coffee, Calendar, CheckCircle, AlertCircle } from "lucide-react"
import { evaluateAwardRules } from "@/lib/api/awards"
import { buildEvaluationRequest, getNextDayOfWeek } from "@/lib/utils/award-evaluation-request"

interface TestAwardDialogProps {
  award: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface TestScenario {
  employmentType: string
  startTime: string
  endTime: string
  dayOfWeek: string
  awardTags: string[]
  weeklyHours: number
  isPublicHoliday: boolean
}

export function TestAwardDialog({ award, open, onOpenChange }: TestAwardDialogProps) {
  const [scenario, setScenario] = useState<TestScenario>({
    employmentType: "full_time",
    startTime: "09:00",
    endTime: "17:00",
    dayOfWeek: "monday",
    awardTags: [],
    weeklyHours: 0,
    isPublicHoliday: false
  })

  const [testResult, setTestResult] = useState<any | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runTest = async () => {
    if (!award?._id) return
    setIsRunning(true)
    setError(null)
    setTestResult(null)

    try {
      // Convert day-of-week selection to concrete date
      const dateStr = getNextDayOfWeek(scenario.dayOfWeek)

      // Use shared helper to build timezone-safe payload
      const payload = buildEvaluationRequest({
        awardId: award._id,
        dateString: dateStr,
        startTime: scenario.startTime,
        endTime: scenario.endTime,
        employmentType: scenario.employmentType,
        awardTags: scenario.awardTags,
        isPublicHoliday: scenario.isPublicHoliday,
        weeklyHoursWorked: scenario.weeklyHours,
      })

      const data = await evaluateAwardRules(payload)

      if (data.error && !data.allRulesEvaluation) {
        setError(data.error)
      } else {
        setTestResult(data)
        if (data.error) setError(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run test")
    } finally {
      setIsRunning(false)
    }
  }

  const toggleTag = (tag: string) => {
    setScenario(prev => ({
      ...prev,
      awardTags: prev.awardTags.includes(tag)
        ? prev.awardTags.filter(t => t !== tag)
        : [...prev.awardTags, tag]
    }))
  }

  const getOutcomeIcon = (type: string) => {
    switch (type) {
      case "ordinary": return <Clock className="h-4 w-4" />
      case "overtime": return <DollarSign className="h-4 w-4" />
      case "break": return <Coffee className="h-4 w-4" />
      case "toil": return <Calendar className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getOutcomeColor = (type: string) => {
    switch (type) {
      case "ordinary": return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
      case "overtime": return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
      case "break": return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300"
      case "toil": return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300"
      default: return "bg-muted text-muted-foreground"
    }
  }

  const formatOutcome = (outcome: any) => {
    if (!outcome) return "—"
    switch (outcome.type) {
      case "ordinary": return `${outcome.multiplier ?? 1}x ordinary`
      case "overtime": return `${outcome.multiplier ?? 1.5}x overtime`
      case "allowance": return `${outcome.flatRate ?? 0} ${outcome.currency ?? "AUD"} allowance`
      case "break": return `${outcome.durationMinutes ?? 0}min ${outcome.isPaid ? "paid" : "unpaid"} break`
      case "toil": return `${outcome.accrualMultiplier ?? 1}x TOIL accrual`
      case "leave": return `${outcome.accrualRate ?? 0}h/h ${outcome.leaveType ?? ""} leave`
      default: return outcome.type
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Test Award: {award?.name}</DialogTitle>
          <DialogDescription>
            Test different scenarios to see how rules apply and compete
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test Scenario */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Scenario</CardTitle>
              <CardDescription>
                Configure a shift scenario to test rule evaluation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Employment Type</Label>
                  <Select
                    value={scenario.employmentType}
                    onValueChange={(value) => setScenario(prev => ({ ...prev, employmentType: value }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select
                    value={scenario.dayOfWeek}
                    onValueChange={(value) => setScenario(prev => ({ ...prev, dayOfWeek: value }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["monday","tuesday","wednesday","thursday","friday","saturday","sunday"].map(d => (
                        <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input type="time" value={scenario.startTime} onChange={(e) => setScenario(prev => ({ ...prev, startTime: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input type="time" value={scenario.endTime} onChange={(e) => setScenario(prev => ({ ...prev, endTime: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Weekly Hours Worked (prior)</Label>
                <Input
                  type="number" min="0" max="80"
                  value={scenario.weeklyHours}
                  onChange={(e) => setScenario(prev => ({ ...prev, weeklyHours: parseInt(e.target.value) || 0 }))}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="publicHoliday"
                  checked={scenario.isPublicHoliday}
                  onCheckedChange={(checked) => setScenario(prev => ({ ...prev, isPublicHoliday: !!checked }))}
                />
                <Label htmlFor="publicHoliday">Public Holiday</Label>
              </div>

              {/* Award Tags */}
              <div className="space-y-2">
                <Label>Award Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {award?.availableTags?.map((tag: any) => {
                    const tagName = typeof tag === "string" ? tag : tag.name
                    return (
                      <Badge
                        key={tagName}
                        variant={scenario.awardTags.includes(tagName) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleTag(tagName)}
                      >
                        {tagName}
                      </Badge>
                    )
                  }) || (
                    <div className="text-sm text-muted-foreground">No tags available</div>
                  )}
                </div>
              </div>

              <Button onClick={runTest} disabled={isRunning} className="w-full">
                {isRunning ? (
                  <><Clock className="h-4 w-4 mr-2 animate-spin" />Running Test...</>
                ) : (
                  <><Play className="h-4 w-4 mr-2" />Run Test</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Test Results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Results</CardTitle>
              <CardDescription>
                See which rules apply and how pay is calculated
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="flex items-center gap-2 p-3 mb-4 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {!testResult && !error ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Run a test to see results</p>
                </div>
              ) : testResult && (
                <div className="space-y-4">
                  {/* Selected Rule */}
                  {testResult.selectedRule ? (
                    <div className="space-y-2">
                      <Label>Selected Rule</Label>
                      <div className="flex items-center justify-between p-3 border rounded-lg border-primary/30 bg-primary/5">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${getOutcomeColor(testResult.selectedOutcome?.type)}`}>
                            {getOutcomeIcon(testResult.selectedOutcome?.type)}
                          </div>
                          <div>
                            <div className="font-medium">{testResult.selectedRule.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatOutcome(testResult.selectedOutcome)}
                            </div>
                          </div>
                        </div>
                        {testResult.selectedOutcome?.multiplier && (
                          <Badge variant="secondary">{testResult.selectedOutcome.multiplier}x</Badge>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800">
                      <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-sm text-yellow-700 dark:text-yellow-300">No rule matched this scenario</span>
                    </div>
                  )}

                  {/* All matched rules */}
                  {testResult.allRulesEvaluation && (
                    <div className="space-y-2">
                      <Label>
                        All Rules ({testResult.allRulesEvaluation.filter((r: any) => r.matched).length} matched / {testResult.allRulesEvaluation.length} total)
                      </Label>
                      <div className="space-y-1 max-h-64 overflow-y-auto">
                        {testResult.allRulesEvaluation.map((evaluation: any, idx: number) => (
                          <div
                            key={idx}
                            className={`flex items-center justify-between p-2 rounded text-sm ${
                              evaluation.matched ? "bg-green-50 dark:bg-green-900/10" : "opacity-50"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {evaluation.matched
                                ? <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                : <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                              }
                              <span className={evaluation.matched ? "font-medium" : "text-muted-foreground"}>
                                {evaluation.rule.name}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              score: {evaluation.totalScore}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {testResult.selectedRule && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm text-green-600 dark:text-green-400">Test completed successfully</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
