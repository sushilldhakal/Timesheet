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
import { Play, Clock, DollarSign, Coffee, Calendar, CheckCircle } from "lucide-react"

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

interface TestResult {
  segments: Array<{
    startTime: string
    endTime: string
    ruleName: string
    outcome: {
      type: string
      multiplier?: number
      flatRate?: number
      durationMinutes?: number
      isPaid?: boolean
    }
    durationMinutes: number
  }>
  totalOrdinaryHours: number
  totalOvertimeHours: number
  totalToilHours: number
  allowances: Array<{
    name: string
    amount: number
    currency: string
  }>
  breakEntitlements: Array<{
    startTime: string
    durationMinutes: number
    isPaid: boolean
  }>
}

export function TestAwardDialog({ award, open, onOpenChange }: TestAwardDialogProps) {
  const [scenario, setScenario] = useState<TestScenario>({
    employmentType: "full_time",
    startTime: "09:00",
    endTime: "17:00",
    dayOfWeek: "monday",
    awardTags: [],
    weeklyHours: 32,
    isPublicHoliday: false
  })

  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const runTest = async () => {
    setIsRunning(true)
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Mock test result based on scenario
    const mockResult: TestResult = {
      segments: [
        {
          startTime: scenario.startTime,
          endTime: "17:00",
          ruleName: scenario.dayOfWeek === "saturday" || scenario.dayOfWeek === "sunday" 
            ? "Weekend Premium" 
            : scenario.awardTags.includes("TOIL") 
              ? "TOIL Accrual" 
              : "Ordinary Time",
          outcome: {
            type: scenario.dayOfWeek === "saturday" || scenario.dayOfWeek === "sunday" 
              ? "overtime" 
              : scenario.awardTags.includes("TOIL") 
                ? "toil" 
                : "ordinary",
            multiplier: scenario.dayOfWeek === "saturday" || scenario.dayOfWeek === "sunday" 
              ? 1.25 
              : 1.0
          },
          durationMinutes: 480 // 8 hours
        }
      ],
      totalOrdinaryHours: scenario.dayOfWeek === "saturday" || scenario.dayOfWeek === "sunday" ? 0 : 8,
      totalOvertimeHours: scenario.dayOfWeek === "saturday" || scenario.dayOfWeek === "sunday" ? 8 : 0,
      totalToilHours: scenario.awardTags.includes("TOIL") ? 8 : 0,
      allowances: scenario.startTime < "07:00" || scenario.endTime > "19:00" 
        ? [{ name: "Shift Allowance", amount: 25, currency: "AUD" }] 
        : [],
      breakEntitlements: [
        {
          startTime: "12:00",
          durationMinutes: 30,
          isPaid: false
        }
      ]
    }
    
    setTestResult(mockResult)
    setIsRunning(false)
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
      case "ordinary":
        return <Clock className="h-4 w-4" />
      case "overtime":
        return <DollarSign className="h-4 w-4" />
      case "break":
        return <Coffee className="h-4 w-4" />
      case "toil":
        return <Calendar className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getOutcomeColor = (type: string) => {
    switch (type) {
      case "ordinary":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
      case "overtime":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
      case "break":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300"
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monday">Monday</SelectItem>
                      <SelectItem value="tuesday">Tuesday</SelectItem>
                      <SelectItem value="wednesday">Wednesday</SelectItem>
                      <SelectItem value="thursday">Thursday</SelectItem>
                      <SelectItem value="friday">Friday</SelectItem>
                      <SelectItem value="saturday">Saturday</SelectItem>
                      <SelectItem value="sunday">Sunday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={scenario.startTime}
                    onChange={(e) => setScenario(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={scenario.endTime}
                    onChange={(e) => setScenario(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Weekly Hours Worked</Label>
                <Input
                  type="number"
                  min="0"
                  max="60"
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
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Running Test...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Test
                  </>
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
              {!testResult ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Run a test to see results</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg dark:bg-blue-900/20">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {testResult.totalOrdinaryHours}h
                      </div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">Ordinary Time</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg dark:bg-green-900/20">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {testResult.totalOvertimeHours}h
                      </div>
                      <div className="text-sm text-green-600 dark:text-green-400">Overtime</div>
                    </div>
                  </div>

                  {testResult.totalToilHours > 0 && (
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {testResult.totalToilHours}h
                      </div>
                      <div className="text-sm text-orange-600">TOIL Accrued</div>
                    </div>
                  )}

                  {/* Applied Rules */}
                  <div className="space-y-2">
                    <Label>Applied Rules</Label>
                    {testResult.segments.map((segment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${getOutcomeColor(segment.outcome.type)}`}>
                            {getOutcomeIcon(segment.outcome.type)}
                          </div>
                          <div>
                            <div className="font-medium">{segment.ruleName}</div>
                            <div className="text-sm text-muted-foreground">
                              {segment.startTime} - {segment.endTime} ({Math.round(segment.durationMinutes / 60)}h)
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {segment.outcome.multiplier && (
                            <Badge variant="secondary">
                              {segment.outcome.multiplier}x
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Allowances */}
                  {testResult.allowances.length > 0 && (
                    <div className="space-y-2">
                      <Label>Allowances</Label>
                      {testResult.allowances.map((allowance, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800">
                          <div className="flex items-center gap-3">
                            <DollarSign className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                            <span className="font-medium">{allowance.name}</span>
                          </div>
                          <Badge variant="secondary">
                            ${allowance.amount} {allowance.currency}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Break Entitlements */}
                  {testResult.breakEntitlements.length > 0 && (
                    <div className="space-y-2">
                      <Label>Break Entitlements</Label>
                      {testResult.breakEntitlements.map((breakEnt, index) => (
                        <div key={index} className="flex items-center justify-between p-3 text-purple-600 bg-primary rounded-lg">
                          <div className="flex items-center gap-3">
                            <Coffee className="h-4 w-4 text-purple-600" />
                            <span className="font-medium">
                              {breakEnt.durationMinutes}min break at {breakEnt.startTime}
                            </span>
                          </div>
                          <Badge variant={breakEnt.isPaid ? "default" : "secondary"}>
                            {breakEnt.isPaid ? "Paid" : "Unpaid"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-green-600 dark:text-green-400">Test completed successfully</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}