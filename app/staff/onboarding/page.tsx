'use client'

import { OnboardingProvider, useOnboarding } from '@/lib/context/staff-onboarding-context'
import { StaffOnboardingWizardLayout } from '@/components/staff-onboarding/StaffOnboardingWizardLayout'
import { StaffOnboardingStep1 } from '@/components/staff-onboarding/steps/StaffOnboardingStep1'
import { StaffOnboardingStep2 } from '@/components/staff-onboarding/steps/StaffOnboardingStep2'
import { StaffOnboardingStep3 } from '@/components/staff-onboarding/steps/StaffOnboardingStep3'
import { StaffOnboardingStep4 } from '@/components/staff-onboarding/steps/StaffOnboardingStep4'
import { StaffOnboardingStep5 } from '@/components/staff-onboarding/steps/StaffOnboardingStep5'
import { StaffOnboardingStep6 } from '@/components/staff-onboarding/steps/StaffOnboardingStep6'
import { StaffOnboardingStep7 } from '@/components/staff-onboarding/steps/StaffOnboardingStep7'

function StaffOnboardingContent() {
  const { currentStep } = useOnboarding()

  return (
    <StaffOnboardingWizardLayout>
      {currentStep === 1 && <StaffOnboardingStep1 />}
      {currentStep === 2 && <StaffOnboardingStep2 />}
      {currentStep === 3 && <StaffOnboardingStep3 />}
      {currentStep === 4 && <StaffOnboardingStep4 />}
      {currentStep === 5 && <StaffOnboardingStep5 />}
      {currentStep === 6 && <StaffOnboardingStep6 />}
      {currentStep === 7 && <StaffOnboardingStep7 />}
    </StaffOnboardingWizardLayout>
  )
}

export default function StaffOnboardingPage() {
  return (
    <OnboardingProvider>
      <StaffOnboardingContent />
    </OnboardingProvider>
  )
}