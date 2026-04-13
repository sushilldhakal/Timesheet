'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format, differenceInDays } from 'date-fns'
import { CheckCircle, AlertCircle, AlertTriangle, Clock } from 'lucide-react'

interface ComplianceStatusTableProps {
  compliance: {
    wwcStatus?: string | null
    wwcExpiryDate?: string | null
    policeClearanceStatus?: string | null
    policeClearanceExpiryDate?: string | null
    foodHandlingStatus?: string | null
    foodHandlingExpiryDate?: string | null
    inductionCompleted?: boolean
    inductionDate?: string | null
    codeOfConductSigned?: boolean
    codeOfConductDate?: string | null
    healthSafetyCertifications?: string[]
  }
}

interface StatusItem {
  name: string
  status: string
  expiryDate?: string | null
  isRequired: boolean
}

export function ComplianceStatusTable({ compliance }: ComplianceStatusTableProps) {
  const items: StatusItem[] = [
    {
      name: 'Working With Children Check (WWC)',
      status: compliance.wwcStatus ?? 'pending',
      expiryDate: compliance.wwcExpiryDate,
      isRequired: true,
    },
    {
      name: 'Police Clearance',
      status: compliance.policeClearanceStatus ?? 'pending',
      expiryDate: compliance.policeClearanceExpiryDate,
      isRequired: true,
    },
    {
      name: 'Food Handling Certification',
      status: compliance.foodHandlingStatus ?? 'pending',
      expiryDate: compliance.foodHandlingExpiryDate,
      isRequired: true,
    },
    {
      name: 'Induction Completed',
      status: compliance.inductionCompleted ? 'completed' : 'pending',
      isRequired: true,
    },
    {
      name: 'Code of Conduct Signed',
      status: compliance.codeOfConductSigned ? 'signed' : 'pending',
      isRequired: true,
    },
  ]

  const getStatusIcon = (item: StatusItem) => {
    if (item.status === 'expired') return <AlertCircle className="h-4 w-4 text-red-600" />
    if (item.status === 'pending') return <Clock className="h-4 w-4 text-amber-600" />
    if (item.expiryDate) {
      const daysLeft = differenceInDays(new Date(item.expiryDate), new Date())
      if (daysLeft < 0) return <AlertCircle className="h-4 w-4 text-red-600" />
      if (daysLeft < 30) return <AlertTriangle className="h-4 w-4 text-amber-600" />
    }
    return <CheckCircle className="h-4 w-4 text-green-600" />
  }

  const getStatusBadge = (item: StatusItem) => {
    if (item.status === 'expired') return <Badge variant="destructive">Expired</Badge>
    if (item.status === 'pending') return <Badge variant="secondary" className="bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-400">Pending</Badge>
    if (item.status === 'completed' || item.status === 'signed') return <Badge variant="default" className="bg-green-600">Completed</Badge>
    if (item.status === 'active' || item.status === 'current' || item.status === 'not_required') return <Badge variant="default" className="bg-green-600">{item.status === 'not_required' ? 'Not Required' : 'Active'}</Badge>
    return <Badge variant="secondary">{item.status}</Badge>
  }

  const getExpiryInfo = (item: StatusItem) => {
    if (!item.expiryDate) return 'No expiry'
    const daysLeft = differenceInDays(new Date(item.expiryDate), new Date())
    if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)} days ago`
    return `Expires in ${daysLeft} days (${format(new Date(item.expiryDate), 'dd MMM yyyy')})`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compliance Status Overview</CardTitle>
        <CardDescription>Summary of all compliance requirements</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left font-semibold">Requirement</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Expiry</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.name} className="border-b hover:bg-muted/50">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(item)}
                      {getStatusBadge(item)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {getExpiryInfo(item)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {compliance.healthSafetyCertifications && compliance.healthSafetyCertifications.length > 0 && (
          <div className="mt-6 space-y-3 border-t pt-6">
            <h4 className="font-semibold">Health & Safety Certifications</h4>
            {compliance.healthSafetyCertifications.map((cert, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-md bg-muted/50 p-3">
                <p className="text-sm font-medium">{cert}</p>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
