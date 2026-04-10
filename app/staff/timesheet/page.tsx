"use client"

import { useEmployeeProfile } from "@/lib/queries/employee-clock"
import { EmployeeTimesheetViewer } from "@/components/employees/employee-timesheet-viewer"

export default function StaffTimesheetPage() {
  const { data: profileData, isLoading } = useEmployeeProfile()
  const employee = profileData?.data?.employee

  if (isLoading) return null
  if (!employee) return null

  return (
    <EmployeeTimesheetViewer
      employeeId={employee.id}
      employeeName={employee.name}
      employeeImageUrl={employee.img || employee.lastClockInImage || ""}
      readOnly
    />
  )
}
