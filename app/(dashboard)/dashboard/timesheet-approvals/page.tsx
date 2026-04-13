"use client"

import { useState } from "react"
import { TimesheetApprovalList } from "@/components/timesheet/timesheet-approval-list"
import { TimesheetApprovalView } from "@/components/timesheet/timesheet-approval-view"

export default function TimesheetApprovalsPage() {
  const [selectedTimesheetId, setSelectedTimesheetId] = useState<string | null>(null)

  if (selectedTimesheetId) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <TimesheetApprovalView
          timesheetId={selectedTimesheetId}
          onBack={() => setSelectedTimesheetId(null)}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Timesheet Approvals</h1>
        <p className="text-sm text-muted-foreground">
          Review, approve, or reject employee timesheets before payroll processing.
        </p>
      </div>
      <TimesheetApprovalList
        onViewTimesheet={(id) => setSelectedTimesheetId(id)}
      />
    </div>
  )
}
