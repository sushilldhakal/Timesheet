'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useEmployeeProfile } from '@/lib/queries/employee-clock'
import { OnboardingProvider, useOnboarding } from '@/lib/context/staff-onboarding-context'
import { StaffOnboardingWizardLayout } from '@/components/staff-onboarding/StaffOnboardingWizardLayout'
import { StaffOnboardingStep1 } from '@/components/staff-onboarding/steps/StaffOnboardingStep1'
import { StaffOnboardingStep2 } from '@/components/staff-onboarding/steps/StaffOnboardingStep2'
import { StaffOnboardingStep3 } from '@/components/staff-onboarding/steps/StaffOnboardingStep3'
import { StaffOnboardingStep4 } from '@/components/staff-onboarding/steps/StaffOnboardingStep4'
import { StaffOnboardingStep5 } from '@/components/staff-onboarding/steps/StaffOnboardingStep5'

function StaffOnboardingContent() {
  const { currentStep } = useOnboarding()

  return (
    <StaffOnboardingWizardLayout>
      {currentStep === 1 && <StaffOnboardingStep1 />}
      {currentStep === 2 && <StaffOnboardingStep2 />}
      {currentStep === 3 && <StaffOnboardingStep3 />}
      {currentStep === 4 && <StaffOnboardingStep4 />}
      {currentStep === 5 && <StaffOnboardingStep5 />}
    </StaffOnboardingWizardLayout>
  )
}

export default function StaffOnboardingPage() {
  const router = useRouter()
  const { data, isLoading } = useEmployeeProfile()
  const employee = data?.data?.employee

  useEffect(() => {
    if (!isLoading && employee?.onboardingCompleted) {
      router.replace('/staff/dashboard')
    }
  }, [isLoading, employee, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (employee?.onboardingCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <OnboardingProvider>
      <StaffOnboardingContent />
    </OnboardingProvider>
  )
}
