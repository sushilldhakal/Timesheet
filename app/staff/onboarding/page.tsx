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

function StaffOnboardingContent() {
  const { currentStep, requiresCompliance, totalSteps } = useOnboarding()

  return (
    <StaffOnboardingWizardLayout>
      {currentStep === 1 && <StaffOnboardingStep1 />}
      {currentStep === 2 && <StaffOnboardingStep2 />}
      {currentStep === 3 && requiresCompliance && <StaffOnboardingStep3 />}
      {currentStep === totalSteps && <StaffOnboardingStep4 />}
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

  // Still loading — wait before showing anything
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Already completed — show spinner while redirect happens
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
