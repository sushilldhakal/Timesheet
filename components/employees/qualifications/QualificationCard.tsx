'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Award, Trash2, Edit2, ExternalLink } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import type { EmployeeQualification } from '@/lib/api/employees'

interface QualificationCardProps {
  qualification: EmployeeQualification
  onEdit?: () => void
  onDelete?: () => void
  canEdit?: boolean
}

export function QualificationCard({
  qualification,
  onEdit,
  onDelete,
  canEdit = false,
}: QualificationCardProps) {
  const formatDate = (date: string) => {
    return format(new Date(date), 'dd MMM yyyy')
  }

  const getStatusBadge = () => {
    if (!qualification.expiryDate) {
      return <Badge variant="default" className="bg-green-600">No Expiry</Badge>
    }

    const daysUntilExpiry = differenceInDays(new Date(qualification.expiryDate), new Date())

    if (daysUntilExpiry < 0) {
      return <Badge variant="destructive">Expired</Badge>
    } else if (daysUntilExpiry < 30) {
      return <Badge variant="secondary" className="bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-400">Expiring Soon</Badge>
    } else {
      return <Badge variant="default" className="bg-green-600">Current</Badge>
    }
  }

  const getDaysUntilExpiry = () => {
    if (!qualification.expiryDate) return null
    return differenceInDays(new Date(qualification.expiryDate), new Date())
  }

  const daysLeft = getDaysUntilExpiry()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Award className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-base">{qualification.qualificationName}</CardTitle>
              <CardDescription>{qualification.issuingBody}</CardDescription>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Issued</p>
            <p className="font-semibold">{formatDate(qualification.issueDate)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Expires</p>
            <p className="font-semibold">
              {qualification.expiryDate ? formatDate(qualification.expiryDate) : 'Never'}
            </p>
          </div>
        </div>

        {daysLeft !== null && daysLeft < 30 && daysLeft >= 0 && (
          <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
            <p className="font-semibold text-amber-900 dark:text-amber-400">Expiring in {daysLeft} days</p>
          </div>
        )}

        {daysLeft !== null && daysLeft < 0 && (
          <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-3 text-sm">
            <p className="font-semibold text-red-900 dark:text-red-400">Expired {Math.abs(daysLeft)} days ago</p>
          </div>
        )}

        {qualification.licenseNumber && (
          <div className="text-sm">
            <p className="text-xs text-muted-foreground">License Number</p>
            <p className="font-mono font-semibold">{qualification.licenseNumber}</p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {qualification.documentUrl && (
            <Button
              size="sm"
              variant="outline"
              asChild
              className="flex-1"
            >
              <a href={qualification.documentUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Document
              </a>
            </Button>
          )}
          {canEdit && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={onEdit}
                className={qualification.documentUrl ? '' : 'flex-1'}
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
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
