'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, User, DollarSign, Award, Shield, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { useEmployeeProfile, useChangeEmployeePassword } from '@/lib/queries/employee-clock'
import { getEmployeeTaxInfo, getEmployeeBankDetails, getEmployeeQualifications, getEmployeeCompliance } from '@/lib/api/employees'
import { EmployeeInfoSidebarCard } from '@/components/employees/employee-info-sidebar-card'
import { ChangePasswordCard } from '@/components/profile/change-password-card'
import { StaffOverviewTab } from '@/components/staff/profile-tabs/staff-overview-tab'
import { StaffPayrollTab } from '@/components/staff/profile-tabs/staff-payroll-tab'
import { StaffQualificationsTab } from '@/components/staff/profile-tabs/staff-qualifications-tab'
import { StaffComplianceTab } from '@/components/staff/profile-tabs/staff-compliance-tab'

export default function StaffProfilePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')

  const employeeProfileQuery = useEmployeeProfile()
  const changePasswordMutation = useChangeEmployeePassword()

  const employeeId = employeeProfileQuery.data?.data?.employee?.id || ''

  // Prefetch all tab data in parallel so tabs render instantly when clicked
  useQuery({
    queryKey: ['employeeTaxInfo', employeeId],
    queryFn: () => getEmployeeTaxInfo(employeeId),
    enabled: !!employeeId,
  })
  useQuery({
    queryKey: ['employeeBankDetails', employeeId],
    queryFn: () => getEmployeeBankDetails(employeeId),
    enabled: !!employeeId,
  })
  useQuery({
    queryKey: ['employeeQualifications', employeeId],
    queryFn: () => getEmployeeQualifications(employeeId),
    enabled: !!employeeId,
  })
  useQuery({
    queryKey: ['employeeCompliance', employeeId],
    queryFn: () => getEmployeeCompliance(employeeId),
    enabled: !!employeeId,
  })

  useEffect(() => {
    if (employeeProfileQuery.isError) {
      toast.error('Session expired. Please log in again.')
      router.push('/')
    }
  }, [employeeProfileQuery.isError, router])

  if (employeeProfileQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (employeeProfileQuery.isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Session expired. Redirecting to login...</p>
          <Button onClick={() => router.push('/')} variant="outline">
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  const employee = employeeProfileQuery.data?.data?.employee

  const handlePasswordChange = async (currentPassword: string, newPassword: string) => {
    return new Promise<void>((resolve, reject) => {
      changePasswordMutation.mutate(
        { currentPassword, newPassword },
        {
          onSuccess: (response) => {
            if (response?.success) {
              toast.success(response.data?.message || 'Password changed successfully!')
            } else if ((response as any)?.message) {
              toast.success((response as any).message)
            } else {
              toast.success('Password changed successfully!')
            }
            resolve()
          },
          onError: (error: any) => {
            if (error?.details && Array.isArray(error.details)) {
              const validationErrors = error.details.map((detail: any) => detail.message).join(', ')
              toast.error(validationErrors)
            } else if (error?.error) {
              toast.error(error.error)
            } else {
              toast.error(typeof error === 'string' ? error : error?.message || 'Failed to change password')
            }
            reject(error)
          },
        }
      )
    })
  }

  return (
    <div className="flex flex-col space-y-6 p-4 lg:p-8">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{employee?.name?.trim() ? employee.name : 'My Profile'}</h1>
          <p className="text-sm text-muted-foreground mt-1">PIN: {employee?.pin || '—'}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div>
          <EmployeeInfoSidebarCard
            name={employee?.name || ''}
            pin={employee?.pin || ''}
            img={employee?.img || ''}
            fallbackImageUrl={employee?.lastClockInImage || ''}
            email={employee?.email?.trim() ? employee.email : undefined}
            phone={employee?.phone?.trim() ? employee.phone : undefined}
            homeAddress={employee?.homeAddress?.trim() ? employee.homeAddress : undefined}
            dob={employee?.dob?.trim() ? employee.dob : undefined}
            standardHoursPerWeek={employee?.standardHoursPerWeek ?? null}
            comment={employee?.comment?.trim() ? employee.comment : undefined}
            employers={
              employee?.employer?.trim()
                ? [{ name: employee.employer }]
                : undefined
            }
          />
        </div>

        <div className="lg:col-span-3">
          <Card>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0">
                <TabsTrigger value="overview" className="rounded-none gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="payroll" className="rounded-none gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="hidden sm:inline">Payroll</span>
                </TabsTrigger>
                <TabsTrigger value="qualifications" className="rounded-none gap-2">
                  <Award className="h-4 w-4" />
                  <span className="hidden sm:inline">Qualifications</span>
                </TabsTrigger>
                <TabsTrigger value="compliance" className="rounded-none gap-2">
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Compliance</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="rounded-none gap-2">
                  <Lock className="h-4 w-4" />
                  <span className="hidden sm:inline">Security</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="p-6 space-y-6">
                {employeeId && employee && <StaffOverviewTab employee={employee} />}
              </TabsContent>

              <TabsContent value="payroll" className="p-6 space-y-6">
                {employeeId && <StaffPayrollTab employeeId={employeeId} />}
              </TabsContent>

              <TabsContent value="qualifications" className="p-6 space-y-6">
                {employeeId && <StaffQualificationsTab employeeId={employeeId} />}
              </TabsContent>

              <TabsContent value="compliance" className="p-6 space-y-6">
                {employeeId && <StaffComplianceTab employeeId={employeeId} />}
              </TabsContent>

              <TabsContent value="security" className="p-6 space-y-6">
                <ChangePasswordCard
                  onSubmit={handlePasswordChange}
                  isLoading={changePasswordMutation.isPending}
                />
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  )
}
