"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock } from "lucide-react"

export default function StaffTimesheetPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Timesheet</h1>
        <p className="text-muted-foreground">View your work hours and time entries</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timesheet
          </CardTitle>
          <CardDescription>
            Your timesheet functionality will be implemented here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This page will show your personal timesheet with clock-in/out times and total hours worked.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
