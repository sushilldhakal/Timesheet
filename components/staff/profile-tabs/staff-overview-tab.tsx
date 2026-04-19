'use client'

import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { User, Briefcase, Clock } from 'lucide-react'
import { ProfileSectionCard, ProfileInfoGrid, ProfileInfoField } from '@/components/shared/profile'

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
      <ProfileSectionCard
        title="Personal Information"
        description="Your personal details (read-only)"
        icon={<User className="h-5 w-5" />}
      >
        <ProfileInfoGrid columns={2}>
          <ProfileInfoField
            label="Full Name"
            value={employee.name}
          />
          <ProfileInfoField
            label="Email"
            value={employee.email}
          />
          <ProfileInfoField
            label="Phone"
            value={employee.phone}
          />
          <ProfileInfoField
            label="Date of Birth"
            value={employee.dob ? format(new Date(employee.dob), 'dd MMM yyyy') : null}
          />
          <ProfileInfoField
            label="Address"
            value={employee.homeAddress}
            span={2}
          />
          <ProfileInfoField
            label="PIN"
            value={employee.pin ? <span className="font-mono">{employee.pin}</span> : null}
          />
        </ProfileInfoGrid>
      </ProfileSectionCard>

      <ProfileSectionCard
        title="Employment Details"
        description="Your employment information"
        icon={<Briefcase className="h-5 w-5" />}
      >
        <ProfileInfoGrid columns={2}>
          <ProfileInfoField
            label="Employer"
            value={employee.employer}
          />
          <ProfileInfoField
            label="Employment Type"
            value={employee.employmentType ? (
              <Badge className="capitalize">{employee.employmentType}</Badge>
            ) : null}
          />
          <ProfileInfoField
            label="Standard Hours per Week"
            value={employee.standardHoursPerWeek ? `${employee.standardHoursPerWeek} hours` : null}
          />
        </ProfileInfoGrid>
      </ProfileSectionCard>
    </div>
  )
}
