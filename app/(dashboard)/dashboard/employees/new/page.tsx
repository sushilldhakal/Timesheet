'use client'

import { OnboardingProvider, useOnboarding } from '@/lib/context/onboarding-context'
import { OnboardingWizardLayout } from '@/components/onboarding/OnboardingWizardLayout'
import { OnboardingStep1 } from '@/components/onboarding/steps/OnboardingStep1'
import { OnboardingStep2 } from '@/components/onboarding/steps/OnboardingStep2'
import { OnboardingStep3 } from '@/components/onboarding/steps/OnboardingStep3'
import { OnboardingStep4 } from '@/components/onboarding/steps/OnboardingStep4'
import { OnboardingStep5 } from '@/components/onboarding/steps/OnboardingStep5'
import { OnboardingStep6 } from '@/components/onboarding/steps/OnboardingStep6'
import { OnboardingStep7 } from '@/components/onboarding/steps/OnboardingStep7'

function OnboardingContent() {
  const { currentStep } = useOnboarding()

  return (
    <OnboardingWizardLayout>
      {currentStep === 1 && <OnboardingStep1 />}
      {currentStep === 2 && <OnboardingStep2 />}
      {currentStep === 3 && <OnboardingStep3 />}
      {currentStep === 4 && <OnboardingStep4 />}
      {currentStep === 5 && <OnboardingStep5 />}
      {currentStep === 6 && <OnboardingStep6 />}
      {currentStep === 7 && <OnboardingStep7 />}
    </OnboardingWizardLayout>
  )
}

export default function EmployeeOnboardingPage() {
  return (
    <OnboardingProvider>
      <OnboardingContent />
    </OnboardingProvider>
  )
}
