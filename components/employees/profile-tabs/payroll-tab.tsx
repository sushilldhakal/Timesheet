"use client"

import { PayrollTab as SharedPayrollTab } from "@/components/shared/profile"

interface PayrollTabProps {
  employeeId: string
}

export function PayrollTab({ employeeId }: PayrollTabProps) {
  return <SharedPayrollTab employeeId={employeeId} />
}
