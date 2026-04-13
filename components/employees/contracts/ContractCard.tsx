'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Trash2, Edit2 } from 'lucide-react'
import { format } from 'date-fns'
import type { EmployeeContract } from '@/lib/api/employees'

interface ContractCardProps {
  contract: EmployeeContract
  isActive: boolean
  onEdit?: () => void
  onDelete?: () => void
  canEdit?: boolean
}

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  permanent: 'Permanent',
  'fixed-term': 'Fixed-Term',
  casual: 'Casual',
  contractor: 'Contractor',
}

const WAGE_TYPE_LABELS: Record<string, string> = {
  salary: 'Salary',
  hourly: 'Hourly',
  piecework: 'Piecework',
}

export function ContractCard({
  contract,
  isActive,
  onEdit,
  onDelete,
  canEdit = false,
}: ContractCardProps) {
  const formatDate = (date: string) => {
    return format(new Date(date), 'dd MMM yyyy')
  }

  const contractTypeLabel = CONTRACT_TYPE_LABELS[contract.contractType] || contract.contractType
  const wageTypeLabel = WAGE_TYPE_LABELS[contract.wageType] || contract.wageType

  return (
    <Card className={isActive ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20' : 'opacity-75'}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5" />
            <div>
              <CardTitle className="text-base">{contractTypeLabel}</CardTitle>
              <CardDescription>{wageTypeLabel}</CardDescription>
            </div>
          </div>
          {isActive && (
            <Badge variant="default" className="bg-green-600">
              Active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Start Date</p>
            <p className="font-semibold">{formatDate(contract.startDate)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">End Date</p>
            <p className="font-semibold">
              {contract.endDate ? formatDate(contract.endDate) : 'No end date'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Salary/Rate</p>
            <p className="font-mono font-semibold">
              AUD ${contract.salary?.toLocaleString()}
              {contract.wageType === 'hourly' ? '/hr' : contract.wageType === 'salary' ? '/year' : ''}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Notice Period</p>
            <p className="font-semibold">{contract.noticePeriod ?? 0} days</p>
          </div>
        </div>

        {contract.probationPeriodEnd && (
          <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-400">Probation End:</p>
            <p className="text-amber-900 dark:text-amber-300">{formatDate(contract.probationPeriodEnd)}</p>
          </div>
        )}

        {canEdit && (
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="flex-1"
            >
              <Edit2 className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
