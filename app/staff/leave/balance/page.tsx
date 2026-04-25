"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function StaffLeaveBalancePage() {
  return (
    <div className="flex flex-col space-y-6 p-4 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold">Leave Balance</h1>
        <p className="text-sm text-muted-foreground">Your leave balances will appear here.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coming soon</CardTitle>
          <CardDescription>
            This page is wired into navigation. Next step is to connect balances from payroll/HR settings.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  )
}

