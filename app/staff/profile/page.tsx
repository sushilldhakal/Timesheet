"use client"

import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Briefcase } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { useEmployeeProfile } from "@/lib/queries/employee-clock"
import { EmployeeInfoSidebarCard } from "@/components/employees/employee-info-sidebar-card"
import EmployeeRoleAssignmentList from "@/components/employees/employee-role-assignment-list"
import EmployeeAwardCard from "@/components/employees/employee-award-card"

export default function StaffProfilePage() {
  const router = useRouter()
  
  const employeeProfileQuery = useEmployeeProfile()

  useEffect(() => {
    if (employeeProfileQuery.isError) {
      toast.error("Session expired. Please log in again.")
      router.push("/")
    }
  }, [employeeProfileQuery.isError, router])

  if (employeeProfileQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (employeeProfileQuery.isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Session expired. Redirecting to login...</p>
          <Button onClick={() => router.push("/")} variant="outline">
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  const employee = employeeProfileQuery.data?.data?.employee
  const employeeId = employee?.id || ""

  return (
    <div className="flex flex-col space-y-6 p-4 lg:p-8">
      {/* Header (same structure as employee detail page, but no edit button) */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{employee?.name?.trim() ? employee.name : "My Profile"}</h1>
          <p className="text-sm text-muted-foreground">PIN: {employee?.pin || "—"}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <EmployeeInfoSidebarCard
          name={employee?.name || ""}
          pin={employee?.pin || ""}
          img={employee?.img || ""}
          fallbackImageUrl={employee?.lastClockInImage || ""}
          email={employee?.email?.trim() ? employee.email : undefined}
          phone={employee?.phone?.trim() ? employee.phone : undefined}
          homeAddress={employee?.homeAddress?.trim() ? employee.homeAddress : undefined}
          dob={employee?.dob?.trim() ? employee.dob : undefined}
          standardHoursPerWeek={employee?.standardHoursPerWeek ?? null}
          comment={employee?.comment?.trim() ? employee.comment : undefined}
          employers={
            employee?.employer?.trim()
              ? [{ name: employee.employer }]
              : undefined
          }
        />

        {/* Same right-side info cards as employee detail page (read-only) */}
        <div className="lg:col-span-2 space-y-6">
          {/* If employeeId isn't ready yet, keep the layout stable */}
          {!employeeId ? (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Details
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">Loading…</CardContent>
            </Card>
          ) : (
            <>
              <EmployeeRoleAssignmentList employeeId={employeeId} readOnly />
              <EmployeeAwardCard
                employeeId={employeeId}
                currentAwardId={employee?.award?.id ?? null}
                currentAwardLevel={employee?.award?.level ?? null}
                currentEmploymentType={employee?.employmentType ?? null}
                onUpdate={() => {
                  // no-op for staff read-only view
                }}
                readOnly
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
