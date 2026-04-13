'use client'

import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useOnboarding } from '@/lib/context/onboarding-context'
import { CheckCircle } from 'lucide-react'

interface OnboardingWizardLayoutProps {
  children: ReactNode
}

const steps = [
  { number: 1, title: 'Basic Information', description: 'Name, email, and contact' },
  { number: 2, title: 'Legal Details', description: 'Legal name and preferences' },
  { number: 3, title: 'Tax Information', description: 'TFN and superannuation' },
  { number: 4, title: 'Banking Details', description: 'Account information' },
  { number: 5, title: 'Contract', description: 'Employment contract' },
  { number: 6, title: 'Compliance', description: 'Clearances and certifications' },
  { number: 7, title: 'Review & Confirm', description: 'Final confirmation' },
]

export function OnboardingWizardLayout({ children }: OnboardingWizardLayoutProps) {
  const { currentStep } = useOnboarding()
  const progress = ((currentStep - 1) / (steps.length - 1)) * 100

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Employee Onboarding</h1>
        <p className="text-muted-foreground mt-1">Step {currentStep} of {steps.length}</p>
      </div>

      <Progress value={progress} className="h-2" />

      <div className="overflow-x-auto">
        <div className="flex gap-2 md:gap-4 pb-4 md:pb-0">
          {steps.map((step) => (
            <div key={step.number} className="flex items-center gap-2 shrink-0 md:shrink">
              <div
                className={`flex items-center justify-center rounded-full w-10 h-10 shrink-0 ${
                  currentStep >= step.number
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {currentStep > step.number ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-semibold">{step.number}</span>
                )}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="pt-8">
          {children}
        </CardContent>
      </Card>
    </div>
  )
}
