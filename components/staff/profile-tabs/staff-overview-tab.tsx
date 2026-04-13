'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { User, Briefcase, Clock } from 'lucide-react'

interface StaffOverviewTabProps {
  employee: {
    name?: string
    email?: string
    phone?: string
    dob?: string
    homeAddress?: string
    pin?: string
    employmentType?: string
    standardHoursPerWeek?: number | null
    employer?: string
  }
}

export function StaffOverviewTab({ employee }: StaffOverviewTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>Your personal details (read-only)</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Full Name</p>
            <p className="text-sm font-semibold mt-1">{employee.name || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Email</p>
            <p className="text-sm font-semibold mt-1">{employee.email || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Phone</p>
            <p className="text-sm font-semibold mt-1">{employee.phone || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Date of Birth</p>
            <p className="text-sm font-semibold mt-1">
              {employee.dob ? format(new Date(employee.dob), 'dd MMM yyyy') : 'Not provided'}
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs font-medium text-muted-foreground uppercase">Address</p>
            <p className="text-sm font-semibold mt-1">{employee.homeAddress || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">PIN</p>
            <p className="text-sm font-mono font-semibold mt-1">{employee.pin || 'Not provided'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Employment Details
          </CardTitle>
          <CardDescription>Your employment information</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Employer</p>
            <p className="text-sm font-semibold mt-1">{employee.employer || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Employment Type</p>
            <div className="mt-1">
              <Badge className="capitalize">{employee.employmentType || 'Not specified'}</Badge>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Standard Hours Per Week</p>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold">
                {employee.standardHoursPerWeek ? `${employee.standardHoursPerWeek} hours` : 'Not set'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
