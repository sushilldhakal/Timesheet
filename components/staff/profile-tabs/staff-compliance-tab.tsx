'use client'

import { ComplianceTab } from "@/components/shared/profile"

interface StaffComplianceTabProps {
  employeeId: string
}

export function StaffComplianceTab({ employeeId }: StaffComplianceTabProps) {
  return <ComplianceTab employeeId={employeeId} isStaffView />
}
