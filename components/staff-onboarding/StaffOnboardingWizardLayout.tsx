'use client'

import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useOnboarding } from '@/lib/context/staff-onboarding-context'
import { CheckCircle, Loader2 } from 'lucide-react'

interface StaffOnboardingWizardLayoutProps {
  children: ReactNode
}

export function StaffOnboardingWizardLayout({ children }: StaffOnboardingWizardLayoutProps) {
  const { currentStep, totalSteps, isLoading } = useOnboarding()

  const steps = [
    { number: 1, title: 'Personal Details', description: 'Your information' },
    { number: 2, title: 'Eligibility & Tax', description: 'Rights & tax details' },
    { number: 3, title: 'Banking & Super', description: 'Payment details' },
    { number: 4, title: 'Documents', description: 'Upload documents' },
    { number: 5, title: 'Review & Submit', description: 'Complete onboarding' },
  ]

  const progress = ((currentStep - 1) / (totalSteps - 1)) * 100

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading your onboarding...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-2 sm:p-4">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div className="text-center space-y-2 px-2">
          <h1 className="text-2xl sm:text-3xl font-bold">Welcome to the Team!</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Complete your onboarding to access your dashboard</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Step {currentStep} of {totalSteps}</p>
        </div>

        <Progress value={progress} className="h-2" />

        <div className="overflow-x-auto -mx-2 sm:mx-0">
          <div className="flex gap-2 sm:gap-3 md:gap-4 pb-4 md:pb-0 px-2 sm:px-0" style={{ minWidth: 'max-content' }}>
            {steps.map((step) => (
              <div key={step.number} className="flex items-center gap-2 shrink-0">
                <div
                  className={`flex items-center justify-center rounded-full w-8 h-8 sm:w-10 sm:h-10 shrink-0 ${
                    currentStep >= step.number
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {currentStep > step.number ? (
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <span className="text-xs sm:text-sm font-semibold">{step.number}</span>
                  )}
                </div>
                <div className="hidden lg:block min-w-0">
                  <p className="text-sm font-semibold truncate">{step.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Card className="shadow-lg">
          <CardContent className="pt-4 sm:pt-6 md:pt-8 px-3 sm:px-6">
            {children}
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground px-2">
          <p>This information is required to complete your employment setup.</p>
          <p>All data is securely stored and used only for payroll and compliance purposes.</p>
        </div>
      </div>
    </div>
  )
}
