"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { getAwards, evaluateAwardRules } from "@/lib/api/awards"
import {
  Play,
  Clock,
  DollarSign,
  Coffee,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RotateCcw,
  History,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react"
import type { AwardRule, RuleConditions } from "@/lib/validations/awards"

interface TestScenario {
  employeeName: string
  shiftDate: string
  startTime: string
  endTime: string
  employmentType: "full_time" | "part_time" | "casual"
  awardId: string
  awardTags: string[]
  weeklyHours: number
  isPublicHoliday: boolean
}

interface ConditionResult {
  name: string
  met: boolean
  detail: string
}

interface RuleMatchResult {
  rule: AwardRule
  matched: boolean
  conditions: ConditionResult[]
  outcomeSummary: string
}

interface TestResult {
  scenario: TestScenario
  awardName: string
  shiftHours: number
  ruleResults: RuleMatchResult[]
  appliedRule: RuleMatchResult | null
  stackedRules: RuleMatchResult[]
  effectiveMultiplier: number
}

const DAYS_OF_WEEK = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const

function calculateShiftHours(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  let hours = eh + em / 60 - (sh + sm / 60)
  if (hours <= 0) hours += 24
  return Math.round(hours * 100) / 100
}

function getDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00")
  return DAYS_OF_WEEK[date.getDay()]
}

function timeToHour(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h + m / 60
}

function evaluateConditions(
  conditions: RuleConditions,
  scenario: TestScenario,
  shiftHours: number,
  dayOfWeek: string
): ConditionResult[] {
  const results: ConditionResult[] = []

  if (conditions.daysOfWeek?.length) {
    const met = conditions.daysOfWeek.includes(dayOfWeek as any)
    results.push({
      name: "Days of Week",
      met,
      detail: met
        ? `${dayOfWeek} is in [${conditions.daysOfWeek.join(", ")}]`
        : `${dayOfWeek} is not in [${conditions.daysOfWeek.join(", ")}]`,
    })
  }

  if (conditions.timeRange) {
    const startHour = timeToHour(scenario.startTime)
    const endHour = timeToHour(scenario.endTime)
    const rangeStart = conditions.timeRange.start
    const rangeEnd = conditions.timeRange.end

    let met: boolean
    if (rangeStart <= rangeEnd) {
      met = startHour >= rangeStart || endHour <= rangeEnd
    } else {
      met = startHour >= rangeStart || endHour <= rangeEnd
    }
    results.push({
      name: "Time Range",
      met,
      detail: met
        ? `Shift ${scenario.startTime}-${scenario.endTime} overlaps range ${rangeStart}:00-${rangeEnd}:00`
        : `Shift ${scenario.startTime}-${scenario.endTime} outside range ${rangeStart}:00-${rangeEnd}:00`,
    })
  }

  if (conditions.afterHoursWorked !== undefined) {
    const met = shiftHours > conditions.afterHoursWorked
    results.push({
      name: "After Hours Worked",
      met,
      detail: met
        ? `${shiftHours}h exceeds threshold of ${conditions.afterHoursWorked}h`
        : `${shiftHours}h does not exceed threshold of ${conditions.afterHoursWorked}h`,
    })
  }

  if (conditions.minHoursWorked !== undefined) {
    const met = shiftHours >= conditions.minHoursWorked
    results.push({
      name: "Min Hours Worked",
      met,
      detail: met
        ? `${shiftHours}h meets minimum of ${conditions.minHoursWorked}h`
        : `${shiftHours}h below minimum of ${conditions.minHoursWorked}h`,
    })
  }

  if (conditions.weeklyHoursThreshold !== undefined) {
    const met = scenario.weeklyHours >= conditions.weeklyHoursThreshold
    results.push({
      name: "Weekly Hours Threshold",
      met,
      detail: met
        ? `${scenario.weeklyHours}h/week meets threshold of ${conditions.weeklyHoursThreshold}h`
        : `${scenario.weeklyHours}h/week below threshold of ${conditions.weeklyHoursThreshold}h`,
    })
  }

  if (conditions.employmentTypes?.length) {
    const met = conditions.employmentTypes.includes(scenario.employmentType)
    results.push({
      name: "Employment Type",
      met,
      detail: met
        ? `${scenario.employmentType} is in [${conditions.employmentTypes.join(", ")}]`
        : `${scenario.employmentType} is not in [${conditions.employmentTypes.join(", ")}]`,
    })
  }

  if (conditions.requiredTags?.length) {
    const met = conditions.requiredTags.every((t) => scenario.awardTags.includes(t))
    results.push({
      name: "Required Tags",
      met,
      detail: met
        ? `All required tags present: [${conditions.requiredTags.join(", ")}]`
        : `Missing required tags: [${conditions.requiredTags.filter((t) => !scenario.awardTags.includes(t)).join(", ")}]`,
    })
  }

  if (conditions.excludedTags?.length) {
    const hasExcluded = conditions.excludedTags.some((t) => scenario.awardTags.includes(t))
    results.push({
      name: "Excluded Tags",
      met: !hasExcluded,
      detail: hasExcluded
        ? `Excluded tag present: [${conditions.excludedTags.filter((t) => scenario.awardTags.includes(t)).join(", ")}]`
        : `No excluded tags present`,
    })
  }

  if (conditions.isPublicHoliday !== undefined) {
    const met = conditions.isPublicHoliday === scenario.isPublicHoliday
    results.push({
      name: "Public Holiday",
      met,
      detail: met
        ? `Public holiday: ${scenario.isPublicHoliday ? "Yes" : "No"} (matches)`
        : `Public holiday: ${scenario.isPublicHoliday ? "Yes" : "No"} (expected ${conditions.isPublicHoliday ? "Yes" : "No"})`,
    })
  }

  return results
}

function getOutcomeSummary(outcome: any): string {
  if (!outcome) return "No outcome"
  switch (outcome.type) {
    case "ordinary":
      return `Ordinary ${outcome.multiplier}x`
    case "overtime":
      return `Overtime ${outcome.multiplier}x`
    case "break":
      return `${outcome.durationMinutes}min ${outcome.isPaid ? "paid" : "unpaid"} break`
    case "allowance":
      return `$${outcome.flatRate} ${outcome.currency || "AUD"} allowance`
    case "toil":
      return `TOIL ${outcome.accrualMultiplier}x accrual`
    case "leave":
      return `Leave ${outcome.accrualRate}hr/${outcome.leaveType}`
    default:
      return "Unknown"
  }
}

function getOutcomeColor(type: string) {
  switch (type) {
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
    case "leave":
      return "bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-300"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function getOutcomeIcon(type: string) {
  switch (type) {
    case "ordinary":
      return <Clock className="h-4 w-4" />
    case "overtime":
      return <DollarSign className="h-4 w-4" />
    case "break":
      return <Coffee className="h-4 w-4" />
    case "toil":
    case "leave":
      return <Calendar className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

export function TestScenariosTab() {
  const [awards, setAwards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isRunning, setIsRunning] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [testHistory, setTestHistory] = useState<TestResult[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [scenario, setScenario] = useState<TestScenario>({
    employeeName: "",
    shiftDate: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "17:00",
    employmentType: "full_time",
    awardId: "",
    awardTags: [],
    weeklyHours: 0,
    isPublicHoliday: false,
  })

  useEffect(() => {
    fetchAwards()
  }, [])

  const fetchAwards = async () => {
    try {
      setLoading(true)
      const data = await getAwards()
      setAwards(data.awards || [])
    } catch {
      setAwards([])
    } finally {
      setLoading(false)
    }
  }

  const selectedAward = useMemo(
    () => awards.find((a) => a._id === scenario.awardId),
    [awards, scenario.awardId]
  )

  const availableTags = useMemo(() => {
    if (!selectedAward?.availableTags) return []
    return selectedAward.availableTags.map((t: any) => (typeof t === "string" ? t : t.name))
  }, [selectedAward])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!scenario.employeeName.trim()) newErrors.employeeName = "Required"
    if (!scenario.shiftDate) newErrors.shiftDate = "Required"
    if (!scenario.startTime) newErrors.startTime = "Required"
    if (!scenario.endTime) newErrors.endTime = "Required"
    if (!scenario.awardId) newErrors.awardId = "Select an award"

    if (scenario.startTime && scenario.endTime && scenario.startTime === scenario.endTime) {
      newErrors.endTime = "Must differ from start time"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const runTest = async () => {
    if (!validate()) return
    if (!selectedAward) return

    setIsRunning(true)

    await new Promise((r) => setTimeout(r, 400))

    const shiftHours = calculateShiftHours(scenario.startTime, scenario.endTime)
    const dayOfWeek = getDayOfWeek(scenario.shiftDate)
    const rules: AwardRule[] = selectedAward.rules || []

    const ruleResults: RuleMatchResult[] = rules
      .filter((r: AwardRule) => r.isActive !== false)
      .map((rule: AwardRule) => {
        const conditions = evaluateConditions(rule.conditions as RuleConditions, scenario, shiftHours, dayOfWeek)
        const allMet = conditions.length === 0 || conditions.every((c) => c.met)
        return {
          rule,
          matched: allMet,
          conditions,
          outcomeSummary: getOutcomeSummary(rule.outcome),
        }
      })
      .sort((a, b) => {
        const specA = a.conditions.length
        const specB = b.conditions.length
        if (specB !== specA) return specB - specA
        return (b.rule.priority ?? 0) - (a.rule.priority ?? 0)
      })

    const matchedRules = ruleResults.filter((r) => r.matched)
    const stackedRules = matchedRules.filter((r) => r.rule.canStack)
    const nonStackedRules = matchedRules.filter((r) => !r.rule.canStack)
    const appliedRule = nonStackedRules[0] || null

    let effectiveMultiplier = 1.0
    if (appliedRule) {
      const outcome = appliedRule.rule.outcome as any
      if (outcome?.multiplier) effectiveMultiplier = outcome.multiplier
    }
    for (const sr of stackedRules) {
      const outcome = sr.rule.outcome as any
      if (outcome?.multiplier && outcome.multiplier > 1) {
        effectiveMultiplier += outcome.multiplier - 1
      }
    }

    const result: TestResult = {
      scenario: { ...scenario },
      awardName: selectedAward.name,
      shiftHours,
      ruleResults,
      appliedRule,
      stackedRules,
      effectiveMultiplier,
    }

    setTestResult(result)
    setTestHistory((prev) => [result, ...prev].slice(0, 10))
    setIsRunning(false)
  }

  const clearResults = () => setTestResult(null)

  const loadFromHistory = (result: TestResult) => {
    setScenario({ ...result.scenario })
    setTestResult(null)
    setHistoryOpen(false)
  }

  const toggleTag = (tag: string) => {
    setScenario((prev) => ({
      ...prev,
      awardTags: prev.awardTags.includes(tag)
        ? prev.awardTags.filter((t) => t !== tag)
        : [...prev.awardTags, tag],
    }))
  }

  const updateScenario = <K extends keyof TestScenario>(key: K, value: TestScenario[K]) => {
    setScenario((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Loading awards...</p>
      </div>
    )
  }

  if (awards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <h3 className="mt-4 text-base font-semibold">No awards available</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Create an award in the Overview tab first, then come back to test it.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Case Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Test Case</CardTitle>
            <CardDescription>Define a shift scenario to test rule evaluation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Employee Name</Label>
              <Input
                placeholder="e.g. John Smith"
                value={scenario.employeeName}
                onChange={(e) => updateScenario("employeeName", e.target.value)}
              />
              {errors.employeeName && (
                <p className="text-xs text-destructive">{errors.employeeName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Award</Label>
              <Select
                value={scenario.awardId}
                onValueChange={(v) => {
                  updateScenario("awardId", v)
                  setScenario((prev) => ({ ...prev, awardId: v, awardTags: [] }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an award" />
                </SelectTrigger>
                <SelectContent>
                  {awards.map((a) => (
                    <SelectItem key={a._id} value={a._id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.awardId && (
                <p className="text-xs text-destructive">{errors.awardId}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Shift Date</Label>
                <Input
                  type="date"
                  value={scenario.shiftDate}
                  onChange={(e) => updateScenario("shiftDate", e.target.value)}
                />
                {errors.shiftDate && (
                  <p className="text-xs text-destructive">{errors.shiftDate}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Employment Type</Label>
                <Select
                  value={scenario.employmentType}
                  onValueChange={(v) => updateScenario("employmentType", v as TestScenario["employmentType"])}
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={scenario.startTime}
                  onChange={(e) => updateScenario("startTime", e.target.value)}
                />
                {errors.startTime && (
                  <p className="text-xs text-destructive">{errors.startTime}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={scenario.endTime}
                  onChange={(e) => updateScenario("endTime", e.target.value)}
                />
                {errors.endTime && (
                  <p className="text-xs text-destructive">{errors.endTime}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Weekly Hours Worked (prior)</Label>
              <Input
                type="number"
                min={0}
                max={80}
                value={scenario.weeklyHours}
                onChange={(e) => updateScenario("weeklyHours", parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="publicHoliday"
                checked={scenario.isPublicHoliday}
                onCheckedChange={(checked) => updateScenario("isPublicHoliday", !!checked)}
              />
              <Label htmlFor="publicHoliday">Public Holiday</Label>
            </div>

            {selectedAward && availableTags.length > 0 && (
              <div className="space-y-2">
                <Label>Award Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag: string) => (
                    <Badge
                      key={tag}
                      variant={scenario.awardTags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            <div className="flex gap-2">
              <Button onClick={runTest} disabled={isRunning} className="flex-1">
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Evaluating...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Test
                  </>
                )}
              </Button>
              {testResult && (
                <Button variant="outline" onClick={clearResults}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Test Results</CardTitle>
              <CardDescription>Rule evaluation results and pay calculation</CardDescription>
            </CardHeader>
            <CardContent>
              {!testResult ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Play className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Configure a test case and click Run Test</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Card */}
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Shift</p>
                        <p className="text-sm font-semibold">{testResult.shiftHours}h</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Rules Matched</p>
                        <p className="text-sm font-semibold">
                          {testResult.ruleResults.filter((r) => r.matched).length}/{testResult.ruleResults.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Multiplier</p>
                        <p className="text-sm font-semibold">{testResult.effectiveMultiplier}x</p>
                      </div>
                    </div>
                    <Separator className="my-3" />
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p><span className="font-medium">Employee:</span> {testResult.scenario.employeeName}</p>
                      <p><span className="font-medium">Award:</span> {testResult.awardName}</p>
                      <p>
                        <span className="font-medium">Date:</span> {testResult.scenario.shiftDate}{" "}
                        ({getDayOfWeek(testResult.scenario.shiftDate)})
                      </p>
                      <p>
                        <span className="font-medium">Time:</span> {testResult.scenario.startTime} - {testResult.scenario.endTime}
                      </p>
                    </div>
                  </div>

                  {/* Applied Outcome */}
                  {testResult.appliedRule && (
                    <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">
                          Applied: {testResult.appliedRule.rule.name}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          {testResult.appliedRule.outcomeSummary}
                          {testResult.appliedRule.rule.priority
                            ? ` · Priority ${testResult.appliedRule.rule.priority}`
                            : ""}
                          {" · "}Specificity {testResult.appliedRule.conditions.length}
                        </p>
                      </div>
                    </div>
                  )}

                  {testResult.stackedRules.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Stacked Rules</p>
                      {testResult.stackedRules.map((sr, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-2 dark:border-blue-800 dark:bg-blue-900/20"
                        >
                          <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                              {sr.rule.name}
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400">{sr.outcomeSummary}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {testResult.ruleResults.filter((r) => r.matched).length === 0 && (
                    <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
                      <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                          No rules matched
                        </p>
                        <p className="text-xs text-yellow-600 dark:text-yellow-400">
                          Check the conditions below to see why each rule didn&apos;t match.
                        </p>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* All Rules Detail */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">All Rules Evaluated</p>
                    {testResult.ruleResults.map((rr, i) => (
                      <RuleResultCard key={i} result={rr} />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Test History */}
      {testHistory.length > 0 && (
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => setHistoryOpen(!historyOpen)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Test History</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {testHistory.length}
                </Badge>
              </div>
              {historyOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          {historyOpen && (
            <CardContent>
              <div className="space-y-2">
                {testHistory.map((result, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {result.scenario.employeeName} · {result.awardName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {result.scenario.shiftDate} {result.scenario.startTime}-{result.scenario.endTime} ·{" "}
                        {result.ruleResults.filter((r) => r.matched).length} rules matched ·{" "}
                        {result.effectiveMultiplier}x
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => loadFromHistory(result)}>
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Re-run
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => setTestHistory([])}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear History
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}

function RuleResultCard({ result }: { result: RuleMatchResult }) {
  const [expanded, setExpanded] = useState(false)
  const outcome = result.rule.outcome as any

  return (
    <div
      className={`rounded-lg border transition-colors ${
        result.matched
          ? "border-green-200 dark:border-green-800"
          : "border-muted"
      }`}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between p-3 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          {result.matched ? (
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <div className="min-w-0">
            <span className="text-sm font-medium">{result.rule.name}</span>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge className={`text-xs ${getOutcomeColor(outcome?.type)}`} variant="outline">
                {getOutcomeIcon(outcome?.type)}
                <span className="ml-1">{result.outcomeSummary}</span>
              </Badge>
              {result.rule.priority ? (
                <span className="text-xs text-muted-foreground">
                  P{result.rule.priority}
                </span>
              ) : null}
              {result.rule.canStack && (
                <Badge variant="outline" className="text-xs">stackable</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">
            {result.conditions.filter((c) => c.met).length}/{result.conditions.length}
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t px-3 py-2 space-y-1">
          {result.conditions.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No conditions — applies to all shifts
            </p>
          ) : (
            result.conditions.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                {c.met ? (
                  <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
                )}
                <div>
                  <span className="font-medium">{c.name}:</span>{" "}
                  <span className="text-muted-foreground">{c.detail}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
