"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Clock, DollarSign, Coffee, Tag, Eye } from "lucide-react"

interface AwardEnhancedRowProps {
  timesheet: {
    name: string
    date: string
    totalHours: string
    awardTags?: string[]
    computed?: {
      segments: Array<{
        startTime: string
        endTime: string
        ruleName: string
        outcome: {
          type: "ordinary" | "overtime" | "allowance" | "toil" | "break" | "leave"
          multiplier?: number
          flatRate?: number
          currency?: string
          accrualMultiplier?: number
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
  }
}

export function AwardEnhancedRow({ timesheet }: AwardEnhancedRowProps) {
  if (!timesheet.computed && (!timesheet.awardTags || timesheet.awardTags.length === 0)) {
    return null // No award data to show
  }

  const getSegmentIcon = (type: string) => {
    switch (type) {
      case "ordinary":
        return <Clock className="h-3 w-3" />
      case "overtime":
        return <DollarSign className="h-3 w-3" />
      case "break":
        return <Coffee className="h-3 w-3" />
      case "toil":
        return <Clock className="h-3 w-3" />
      default:
        return <Clock className="h-3 w-3" />
    }
  }

  const getSegmentColor = (type: string) => {
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
    <div className="mt-2 space-y-2">
      {/* Award Tags */}
      {timesheet.awardTags && timesheet.awardTags.length > 0 && (
        <div className="flex items-center gap-2">
          <Tag className="h-3 w-3 text-muted-foreground" />
          <div className="flex flex-wrap gap-1">
            {timesheet.awardTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Pay Summary */}
      {timesheet.computed && (
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            <span>{timesheet.computed.totalOrdinaryHours}h ordinary</span>
          </div>
          {timesheet.computed.totalOvertimeHours > 0 && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-green-600 dark:text-green-400" />
              <span>{timesheet.computed.totalOvertimeHours}h overtime</span>
            </div>
          )}
          {timesheet.computed.totalToilHours > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-orange-600 dark:text-orange-400" />
              <span>{timesheet.computed.totalToilHours}h TOIL</span>
            </div>
          )}
          {timesheet.computed.allowances.length > 0 && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
              <span>${timesheet.computed.allowances.reduce((sum, a) => sum + a.amount, 0)} allowances</span>
            </div>
          )}
          
          {/* View Details Button */}
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-6 px-2 text-xs">
                <Eye className="h-3 w-3 mr-1" />
                Details
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Award Breakdown: {timesheet.name}</DialogTitle>
                <DialogDescription>
                  {timesheet.date} • {timesheet.totalHours} total hours
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Pay Segments */}
                <div>
                  <h4 className="font-medium mb-2">Pay Segments</h4>
                  <div className="space-y-2">
                    {timesheet.computed.segments.map((segment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${getSegmentColor(segment.outcome.type)}`}>
                            {getSegmentIcon(segment.outcome.type)}
                          </div>
                          <div>
                            <div className="font-medium">{segment.ruleName}</div>
                            <div className="text-sm text-muted-foreground">
                              {segment.startTime} - {segment.endTime} ({Math.round(segment.durationMinutes / 60 * 10) / 10}h)
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {segment.outcome.multiplier && (
                            <Badge variant="secondary">
                              {segment.outcome.multiplier}x rate
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Allowances */}
                {timesheet.computed.allowances.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Allowances</h4>
                    <div className="space-y-2">
                      {timesheet.computed.allowances.map((allowance, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                            <span>{allowance.name}</span>
                          </div>
                          <Badge variant="secondary">
                            ${allowance.amount} {allowance.currency}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Break Entitlements */}
                {timesheet.computed.breakEntitlements.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Break Entitlements</h4>
                    <div className="space-y-2">
                      {timesheet.computed.breakEntitlements.map((breakEnt, index) => (
                        <div key={index} className="flex items-center justify-between p-3 ">
                          <div className="flex items-center gap-2">
                            <Coffee className="h-4 w-4" />
                            <span>{breakEnt.durationMinutes}min break at {breakEnt.startTime}</span>
                          </div>
                          <Badge variant={breakEnt.isPaid ? "default" : "secondary"}>
                            {breakEnt.isPaid ? "Paid" : "Unpaid"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  )
}