"use client"

import { QualificationsTab } from "@/components/shared/profile"

interface DevelopmentTabProps {
  employeeId: string
  canEditPayroll?: boolean
}

export function DevelopmentTab({ employeeId, canEditPayroll = false }: DevelopmentTabProps) {
  return <QualificationsTab employeeId={employeeId} canEdit={canEditPayroll} />
}
