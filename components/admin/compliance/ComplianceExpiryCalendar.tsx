'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { eachDayOfInterval, startOfMonth, endOfMonth, format, isToday, differenceInDays, getDay } from 'date-fns'
import type { ComplianceIssue } from '@/lib/utils/compliance-dashboard'

interface ComplianceExpiryCalendarProps {
  issues: ComplianceIssue[]
}

export function ComplianceExpiryCalendar({ issues }: ComplianceExpiryCalendarProps) {
  const today = new Date()
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const issuesByDate = new Map<string, ComplianceIssue[]>()
  issues.forEach((issue) => {
    if (issue.expiryDate) {
      const dateKey = format(new Date(issue.expiryDate), 'yyyy-MM-dd')
      if (!issuesByDate.has(dateKey)) issuesByDate.set(dateKey, [])
      issuesByDate.get(dateKey)!.push(issue)
    }
  })

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const startDayOfWeek = getDay(monthStart)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upcoming Expirations</CardTitle>
        <CardDescription>{format(today, 'MMMM yyyy')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {daysInMonth.map((date) => {
              const dateKey = format(date, 'yyyy-MM-dd')
              const dayIssues = issuesByDate.get(dateKey) || []
              const isTodayDate = isToday(date)

              return (
                <div
                  key={dateKey}
                  className={`p-1.5 rounded-md text-xs text-center border ${
                    isTodayDate
                      ? 'bg-primary/10 border-primary'
                      : dayIssues.length > 0
                        ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'
                        : 'bg-muted/30 border-transparent'
                  }`}
                >
                  <div className="font-semibold">{date.getDate()}</div>
                  {dayIssues.length > 0 && (
                    <div className="text-[10px] text-red-600 font-semibold">{dayIssues.length}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-3 border-t pt-4">
          <h4 className="font-semibold text-sm">Next Expirations</h4>
          {Array.from(issuesByDate.entries())
            .filter(([dateKey]) => {
              const daysLeft = differenceInDays(new Date(dateKey), today)
              return daysLeft >= 0 && daysLeft <= 90
            })
            .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
            .slice(0, 8)
            .map(([dateKey, dayIssues]) => (
              <div key={dateKey} className="p-3 bg-muted/50 rounded-md">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold">{format(new Date(dateKey), 'MMM d, yyyy')}</p>
                  <Badge variant={dayIssues[0].severity === 'critical' ? 'destructive' : 'secondary'}>
                    {dayIssues.length} {dayIssues.length === 1 ? 'issue' : 'issues'}
                  </Badge>
                </div>
                <ul className="text-xs space-y-0.5">
                  {dayIssues.map((issue, idx) => (
                    <li key={idx} className="text-muted-foreground">• {issue.employeeName} — {issue.issueType}</li>
                  ))}
                </ul>
              </div>
            ))}
          {Array.from(issuesByDate.entries()).filter(([dateKey]) => differenceInDays(new Date(dateKey), today) >= 0 && differenceInDays(new Date(dateKey), today) <= 90).length === 0 && (
            <p className="text-sm text-muted-foreground">No expirations in the next 90 days.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
