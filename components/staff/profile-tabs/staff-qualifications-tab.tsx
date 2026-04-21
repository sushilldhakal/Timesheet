'use client'

import { QualificationsTab } from "@/components/shared/profile"

interface StaffQualificationsTabProps {
  employeeId: string
}

export function StaffQualificationsTab({ employeeId }: StaffQualificationsTabProps) {
  return <QualificationsTab employeeId={employeeId} canEdit isStaffView />
}
