'use client'

import { PayrollTab } from "@/components/shared/profile"

interface StaffPayrollTabProps {
  employeeId: string
}

export function StaffPayrollTab({ employeeId }: StaffPayrollTabProps) {
  return <PayrollTab employeeId={employeeId} isStaffView />
}
