"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "lucide-react"

export default function StaffRosterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Roster</h1>
        <p className="text-muted-foreground">View your scheduled shifts and workplace roster</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Roster Schedule
          </CardTitle>
          <CardDescription>
            Your roster and workplace schedule will be displayed here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This page will show your upcoming shifts and the roster for your workplace location.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
