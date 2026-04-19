"use client"

import { useState, useEffect, useCallback, Fragment } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Play,
  Loader2,
  RotateCcw,
  CheckCircle,
  XCircle,
  Star,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Clock,
  AlertCircle,
  Info,
} from "lucide-react"
import { getAwards, evaluateAwardRules } from "@/lib/api/awards"

interface AwardOption {
  _id: string
  name: string
  availableTags?: { name: string; description?: string }[]
  rules?: unknown[]
}

interface ConditionEval {
  conditionName: string
  conditionValue: unknown
  met: boolean
  reason: string
}

interface RuleEval {
  rule: {
    id?: string
    name: string
    description?: string
    priority: number
    isActive: boolean
    canStack: boolean
    conditions: Record<string, unknown>
    outcome: {
      type: string
      multiplier?: number
      flatRate?: number
      accrualMultiplier?: number
      accrualRate?: number
      durationMinutes?: number
      isPaid?: boolean
      exportName: string
      description?: string
      currency?: string
      leaveType?: string
    }
  }
  matched: boolean
  matchedConditions: ConditionEval[]
  unmatchedConditions: { conditionName: string; conditionValue: unknown; reason: string }[]
  specificity: number
  priority: number
  totalScore: number
}

interface EvaluationResult {
  allRulesEvaluation: RuleEval[]
  selectedRule: RuleEval['rule'] | null
  selectedOutcome: RuleEval['rule']['outcome'] | null
  explanation: string
  error?: string
}

export function RuleSimulator() {
  const [awards, setAwards] = useState<AwardOption[]>([])
  const [loadingAwards, setLoadingAwards] = useState(true)

  const [awardId, setAwardId] = useState("")
  const [employmentType, setEmploymentType] = useState("full_time")
  const [shiftDate, setShiftDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split("T")[0]
  })
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("17:00")
  const [awardTags, setAwardTags] = useState<string[]>([])
  const [isPublicHoliday, setIsPublicHoliday] = useState(false)
  const [weeklyHoursWorked, setWeeklyHoursWorked] = useState(0)
  const [baseRate, setBaseRate] = useState(30)

  const [result, setResult] = useState<EvaluationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedRule, setExpandedRule] = useState<string | null>(null)

  useEffect(() => {
    fetchAwards()
  }, [])

  const fetchAwards = async () => {
    try {
      setLoadingAwards(true)
      const data = await getAwards()
      setAwards(data.awards || [])
    } catch {
      setAwards([])
    } finally {
      setLoadingAwards(false)
    }
  }

  const selectedAward = awards.find(a => a._id === awardId)
  const availableTags = selectedAward?.availableTags?.map(t => t.name) || []

  const calculateShiftHours = useCallback(() => {
    const [sh, sm] = startTime.split(":").map(Number)
    const [eh, em] = endTime.split(":").map(Number)
    let startMins = sh * 60 + sm
    let endMins = eh * 60 + em
    if (endMins <= startMins) endMins += 24 * 60
    return (endMins - startMins) / 60
  }, [startTime, endTime])

  const shiftHours = calculateShiftHours()
  const dailyHoursWorked = shiftHours

  const handleEvaluate = async () => {
    if (!awardId) {
      setError("Please select an award first.")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const dateObj = new Date(shiftDate + "T" + startTime + ":00")
      const endDateObj = new Date(shiftDate + "T" + endTime + ":00")
      if (endDateObj <= dateObj) {
        endDateObj.setDate(endDateObj.getDate() + 1)
      }

      const data = await evaluateAwardRules({
        awardId,
        shiftDate: dateObj.toISOString(),
        startTime: dateObj.toISOString(),
        endTime: endDateObj.toISOString(),
        employmentType,
        awardTags,
        isPublicHoliday,
        dailyHoursWorked,
        weeklyHoursWorked,
      })

      if (data.error && !data.allRulesEvaluation) {
        setError(data.error)
      } else {
        setResult(data)
        if (data.error) setError(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to evaluate rules")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setError(null)
    setAwardTags([])
    setIsPublicHoliday(false)
    setWeeklyHoursWorked(0)
    setExpandedRule(null)
  }

  const toggleTag = (tag: string) => {
    setAwardTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const formatOutcome = (outcome: RuleEval['rule']['outcome']) => {
    switch (outcome.type) {
      case 'ordinary':
        return `${outcome.multiplier ?? 1}x Ordinary`
      case 'overtime':
        return `${outcome.multiplier ?? 1.5}x Overtime`
      case 'allowance':
        return `$${outcome.flatRate ?? 0} ${outcome.currency ?? 'AUD'} Allowance`
      case 'toil':
        return `${outcome.accrualMultiplier ?? 1}x TOIL Accrual`
      case 'break':
        return `${outcome.durationMinutes ?? 0}min ${outcome.isPaid ? 'Paid' : 'Unpaid'} Break`
      case 'leave':
        return `${outcome.accrualRate ?? 0}h/h ${outcome.leaveType ?? ''} Leave`
      default:
        return outcome.type
    }
  }

  const calculateImpact = (outcome: RuleEval['rule']['outcome']) => {
    if (outcome.type === 'ordinary' || outcome.type === 'overtime') {
      const multiplier = outcome.multiplier ?? 1
      const cost = shiftHours * baseRate * multiplier
      return {
        formula: `${shiftHours.toFixed(1)}h × $${baseRate}/hr × ${multiplier}x`,
        total: cost,
      }
    }
    if (outcome.type === 'allowance') {
      return {
        formula: `Flat rate allowance`,
        total: outcome.flatRate ?? 0,
      }
    }
    if (outcome.type === 'toil') {
      const mult = outcome.accrualMultiplier ?? 1
      return {
        formula: `${shiftHours.toFixed(1)}h × ${mult}x = ${(shiftHours * mult).toFixed(1)}h TOIL`,
        total: 0,
      }
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Play className="h-4 w-4" />
            Shift Configuration
          </CardTitle>
          <CardDescription>
            Configure a hypothetical shift to test which award rules match.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Award Selection */}
          <div className="space-y-2">
            <Label>Award</Label>
            {loadingAwards ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading awards...
              </div>
            ) : (
              <Select value={awardId} onValueChange={setAwardId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an award to test..." />
                </SelectTrigger>
                <SelectContent>
                  {awards.map(a => (
                    <SelectItem key={a._id} value={a._id}>
                      {a.name} ({a.rules?.length || 0} rules)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Employment Type */}
          <div className="space-y-2">
            <Label>Employment Type</Label>
            <div className="flex gap-3">
              {[
                { value: "full_time", label: "Full Time" },
                { value: "part_time", label: "Part Time" },
                { value: "casual", label: "Casual" },
              ].map(opt => (
                <Button
                  key={opt.value}
                  variant={employmentType === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEmploymentType(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Shift Date</Label>
              <Input
                type="date"
                value={shiftDate}
                onChange={e => setShiftDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Calculated Hours */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>Shift duration: <strong className="text-foreground">{shiftHours.toFixed(1)}h</strong></span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1.5">
              <span>Day: <strong className="text-foreground">
                {new Date(shiftDate + "T12:00:00").toLocaleDateString('en-US', { weekday: 'long' })}
              </strong></span>
            </div>
          </div>

          <Separator />

          {/* Additional Context */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Weekly Hours Worked (prior)</Label>
              <Input
                type="number"
                min={0}
                value={weeklyHoursWorked}
                onChange={e => setWeeklyHoursWorked(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Base Hourly Rate ($)</Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={baseRate}
                onChange={e => setBaseRate(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Public Holiday */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="publicHoliday"
              checked={isPublicHoliday}
              onCheckedChange={(checked) => setIsPublicHoliday(checked === true)}
            />
            <Label htmlFor="publicHoliday" className="text-sm font-normal cursor-pointer">
              This is a public holiday
            </Label>
          </div>

          {/* Award Tags */}
          {availableTags.length > 0 && (
            <div className="space-y-2">
              <Label>Award Tags</Label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={awardTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer select-none"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button onClick={handleEvaluate} disabled={loading || !awardId}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {loading ? "Evaluating..." : "Evaluate Rules"}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && result.allRulesEvaluation.length > 0 && (
        <>
          {/* All Rules Table */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Rule Evaluation Results</CardTitle>
              <CardDescription>
                {result.allRulesEvaluation.filter(r => r.matched).length} of{" "}
                {result.allRulesEvaluation.length} rules matched
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Rule Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Matched</TableHead>
                      <TableHead>Unmatched</TableHead>
                      <TableHead className="text-center">Specificity</TableHead>
                      <TableHead className="text-center">Priority</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead className="text-center">Selected</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.allRulesEvaluation.map((evaluation, idx) => {
                      const isSelected =
                        result.selectedRule &&
                        evaluation.rule.name === result.selectedRule.name &&
                        evaluation.matched
                      const isExpanded = expandedRule === `${idx}`
                      return (
                        <Fragment key={idx}>
                          <TableRow
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-primary/5 hover:bg-primary/10"
                                : evaluation.matched
                                  ? "hover:bg-muted/50"
                                  : "opacity-60 hover:opacity-80"
                            }`}
                            onClick={() => setExpandedRule(isExpanded ? null : `${idx}`)}
                          >
                            <TableCell className="w-8 pr-0">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {evaluation.rule.name}
                            </TableCell>
                            <TableCell>
                              {evaluation.matched ? (
                                <Badge variant="default" className="gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Matched
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="gap-1">
                                  <XCircle className="h-3 w-3" />
                                  No Match
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {evaluation.matchedConditions.length > 0
                                ? evaluation.matchedConditions.map(c => c.conditionName).join(", ")
                                : <span className="text-muted-foreground text-xs">(none)</span>}
                            </TableCell>
                            <TableCell>
                              {evaluation.unmatchedConditions.length > 0
                                ? evaluation.unmatchedConditions.map(c => c.conditionName).join(", ")
                                : <span className="text-muted-foreground text-xs">—</span>}
                            </TableCell>
                            <TableCell className="text-center font-mono">
                              {evaluation.specificity}
                            </TableCell>
                            <TableCell className="text-center font-mono">
                              {evaluation.priority}
                            </TableCell>
                            <TableCell className="text-center font-mono font-semibold">
                              {evaluation.totalScore}
                            </TableCell>
                            <TableCell className="text-center">
                              {isSelected && (
                                <Star className="h-4 w-4 text-amber-500 fill-amber-500 mx-auto" />
                              )}
                            </TableCell>
                          </TableRow>

                          {/* Expanded Detail Row */}
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={9} className="bg-muted/30 p-0">
                                <div className="p-4 space-y-3">
                                  {evaluation.rule.description && (
                                    <p className="text-sm text-muted-foreground">
                                      {evaluation.rule.description}
                                    </p>
                                  )}

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Matched Conditions */}
                                    <div className="space-y-2">
                                      <h4 className="text-sm font-medium flex items-center gap-1.5 text-green-700 dark:text-green-400">
                                        <CheckCircle className="h-3.5 w-3.5" />
                                        Matched Conditions ({evaluation.matchedConditions.length})
                                      </h4>
                                      {evaluation.matchedConditions.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic">
                                          No conditions — always matches (base rule)
                                        </p>
                                      ) : (
                                        <ul className="space-y-1">
                                          {evaluation.matchedConditions.map((c, ci) => (
                                            <li key={ci} className="text-xs flex items-start gap-1.5">
                                              <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                                              <span>
                                                <strong>{c.conditionName}:</strong> {c.reason}
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>

                                    {/* Unmatched Conditions */}
                                    <div className="space-y-2">
                                      <h4 className="text-sm font-medium flex items-center gap-1.5 text-red-700 dark:text-red-400">
                                        <XCircle className="h-3.5 w-3.5" />
                                        Unmatched Conditions ({evaluation.unmatchedConditions.length})
                                      </h4>
                                      {evaluation.unmatchedConditions.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic">
                                          All conditions met
                                        </p>
                                      ) : (
                                        <ul className="space-y-1">
                                          {evaluation.unmatchedConditions.map((c, ci) => (
                                            <li key={ci} className="text-xs flex items-start gap-1.5">
                                              <XCircle className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
                                              <span>
                                                <strong>{c.conditionName}:</strong> {c.reason}
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  </div>

                                  <Separator />

                                  {/* Outcome Preview */}
                                  <div className="text-xs space-y-1">
                                    <span className="font-medium">Outcome: </span>
                                    <Badge variant="outline" className="ml-1">
                                      {formatOutcome(evaluation.rule.outcome)}
                                    </Badge>
                                    <span className="ml-2 text-muted-foreground">
                                      Export: {evaluation.rule.outcome.exportName}
                                    </span>
                                  </div>

                                  <div className="text-xs text-muted-foreground">
                                    Score: ({evaluation.specificity} × 100) + {evaluation.priority} = <strong>{evaluation.totalScore}</strong>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Selected Rule Detail */}
          {result.selectedRule && result.selectedOutcome && (
            <Card className="border-primary/30">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <CardTitle className="text-base">
                    Selected Rule: {result.selectedRule.name}
                  </CardTitle>
                </div>
                <CardDescription>
                  This rule wins because it has the highest score among all matched rules.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Outcome Details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Outcome Type</p>
                    <p className="text-sm font-medium capitalize">{result.selectedOutcome.type}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {result.selectedOutcome.type === 'allowance' ? 'Flat Rate' : 'Multiplier'}
                    </p>
                    <p className="text-sm font-medium">
                      {result.selectedOutcome.type === 'allowance'
                        ? `$${result.selectedOutcome.flatRate ?? 0}`
                        : `${result.selectedOutcome.multiplier ?? result.selectedOutcome.accrualMultiplier ?? 1}x`}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Export Name</p>
                    <p className="text-sm font-medium font-mono">{result.selectedOutcome.exportName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p className="text-sm">{result.selectedOutcome.description || "—"}</p>
                  </div>
                </div>

                <Separator />

                {/* Cost Impact */}
                {(() => {
                  const impact = calculateImpact(result.selectedOutcome!)
                  if (!impact) return null
                  return (
                    <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <h4 className="text-sm font-medium">
                          Impact for {shiftHours.toFixed(1)} hour shift at ${baseRate}/hr base
                        </h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {impact.formula}
                      </p>
                      {impact.total > 0 && (
                        <p className="text-lg font-semibold">
                          = ${impact.total.toFixed(2)}
                        </p>
                      )}
                    </div>
                  )
                })()}

                {/* Score Breakdown */}
                {(() => {
                  const sel = result.allRulesEvaluation.find(
                    r => r.rule.name === result.selectedRule!.name && r.matched
                  )
                  if (!sel) return null
                  return (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <Info className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Specificity: {sel.specificity} ({sel.specificity} condition{sel.specificity !== 1 ? 's' : ''} matched)
                        {' · '}Score: ({sel.specificity} × 100) + {sel.priority} = {sel.totalScore}
                        {' · '}Selected: YES (Highest score)
                      </span>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          )}

          {/* Explanation */}
          {result.explanation && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Evaluation Log</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs font-mono bg-muted/50 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
                  {result.explanation}
                </pre>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* No Results Yet */}
      {!result && !error && !loading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Play className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="mt-3 text-sm font-medium">No simulation run yet</h3>
            <p className="mt-1 text-xs text-muted-foreground text-center max-w-sm">
              Select an award, configure a shift scenario, and click &quot;Evaluate Rules&quot; to see which rules match and why.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
