"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useAuth } from "@/components/auth/AuthProvider"

const DashboardContent = dynamic(
  () => import("@/components/dashboard/DashboardContent").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="text-muted-foreground py-8 text-center text-sm">
        Loading dashboard…
      </div>
    ),
  }
)

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Operational view and analytics</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/employees"
          className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
        >
          <h2 className="font-medium">Staff / Employees</h2>
          <p className="mt-1 text-sm text-muted-foreground">Add, edit, and manage employees</p>
        </Link>
        <Link
          href="/dashboard/timesheet"
          className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
        >
          <h2 className="font-medium">Timesheet</h2>
          <p className="mt-1 text-sm text-muted-foreground">View and generate timesheets</p>
        </Link>
        <Link
          href="/dashboard/flag"
          className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
        >
          <h2 className="font-medium">Flagged punches</h2>
          <p className="mt-1 text-sm text-muted-foreground">No image or location (last 30 days)</p>
        </Link>
        {(user?.role === "admin" || user?.role === "super_admin") && (
          <Link
            href="/dashboard/users"
            className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
          >
            <h2 className="font-medium">Users</h2>
            <p className="mt-1 text-sm text-muted-foreground">Manage admin and user accounts</p>
          </Link>
        )}
      </div>

      <DashboardContent />
    </div>
  )
}
