"use client"

import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Calendar, Clock, User, Settings } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useEmployeeProfile, useEmployeeLogout } from "@/lib/queries/employee-clock"

export default function StaffDashboardPage() {
  const router = useRouter()
  
  const employeeProfileQuery = useEmployeeProfile()
  const employeeLogoutMutation = useEmployeeLogout()

  // Check if onboarding is completed
  useEffect(() => {
    if (employeeProfileQuery.data?.data?.employee) {
      const employee = employeeProfileQuery.data.data.employee
      // Check if onboarding is completed - if not, redirect to onboarding
      if (!employee.onboardingCompleted) {
        router.push("/staff/onboarding")
        return
      }
    }
  }, [employeeProfileQuery.data, router])

  const handleLogout = () => {
    employeeLogoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Logged out successfully")
        router.push("/")
      },
      onError: () => {
        toast.error("Logout failed")
      }
    })
  }

  if (employeeProfileQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (employeeProfileQuery.isError) {
    toast.error("Session expired")
    router.push("/")
    return null
  }

  const employee = employeeProfileQuery.data?.data?.employee

  // If onboarding not completed, don't render dashboard (redirect will happen in useEffect)
  if (!employee?.onboardingCompleted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {employee?.name}!</h1>
          <p className="text-muted-foreground">Staff Dashboard</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          Logout
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              This Week
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">32.5 hrs</div>
            <p className="text-xs text-muted-foreground">
              +2.5 from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Upcoming Shifts
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">
              Next 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Location
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employee?.location || "N/A"}</div>
            <p className="text-xs text-muted-foreground">
              Primary location
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Role
            </CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employee?.role || "Staff"}</div>
            <p className="text-xs text-muted-foreground">
              Current role
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Timesheet */}
        <Card>
          <CardHeader>
            <CardTitle>My Timesheet</CardTitle>
            <CardDescription>
              View and manage your work hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Your timesheet for the current period
            </p>
            <Button className="w-full" onClick={() => router.push("/staff/timesheet")}>
              View Timesheet
            </Button>
          </CardContent>
        </Card>

        {/* Roster */}
        <Card>
          <CardHeader>
            <CardTitle>My Roster</CardTitle>
            <CardDescription>
              View your upcoming shifts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Your scheduled shifts for the next 2 weeks
            </p>
            <Button className="w-full" onClick={() => router.push("/staff/roster")}>
              View Roster
            </Button>
          </CardContent>
        </Card>

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
            <CardDescription>
              Manage your account settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{employee?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">PIN:</span>
                <span className="font-mono font-medium">{employee?.pin}</span>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => router.push("/staff/profile")}>
              View Profile
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              <Clock className="mr-2 h-4 w-4" />
              Clock In/Out (Kiosk)
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => router.push("/staff/profile")}
            >
              <Settings className="mr-2 h-4 w-4" />
              View Profile & Settings
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-4">
            <div className="rounded-full bg-primary/10 p-2">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Kiosk Clock-In</h3>
              <p className="text-sm text-muted-foreground">
                For quick clock-in/out at your location, use the kiosk with your PIN: <span className="font-mono font-bold">{employee?.pin}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
