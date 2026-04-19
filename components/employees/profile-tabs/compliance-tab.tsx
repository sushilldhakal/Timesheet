"use client"

import { ComplianceTab as SharedComplianceTab } from "@/components/shared/profile"

interface ComplianceTabProps {
  employeeId: string
  canEditPayroll?: boolean
}

export function ComplianceTab({ employeeId, canEditPayroll = false }: ComplianceTabProps) {
  return <SharedComplianceTab employeeId={employeeId} canEditPayroll={canEditPayroll} />
}
