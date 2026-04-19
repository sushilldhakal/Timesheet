'use client'

import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useOnboarding } from '@/lib/context/staff-onboarding-context'
import { CheckCircle, Loader2 } from 'lucide-react'

interface StaffOnboardingWizardLayoutProps {
  children: ReactNode
}

const steps = [
  { number: 1, title: 'Personal Information', description: 'Verify your contact details' },
  { number: 2, title: 'Legal Details', description: 'Legal name and preferences' },
  { number: 3, title: 'Tax Information', description: 'TFN and superannuation' },
  { number: 4, title: 'Banking Details', description: 'Account for payroll' },
  { number: 5, title: 'Employment Contract', description: 'Contract details' },
  { number: 6, title: 'Compliance', description: 'Clearances and certifications' },
  { number: 7, title: 'Review & Submit', description: 'Complete your onboarding' },
]

export function StaffOnboardingWizardLayout({ children }: StaffOnboardingWizardLayoutProps) {
  const { currentStep, isLoading } = useOnboarding()
  const progress = ((currentStep - 1) / (steps.length - 1)) * 100

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome to the Team!</h1>
          <p className="text-muted-foreground">Complete your onboarding to access your dashboard</p>
          <p className="text-sm text-muted-foreground">Step {currentStep} of {steps.length}</p>
        </div>

        <Progress value={progress} className="h-2" />

        <div className="overflow-x-auto">
          <div className="flex gap-2 md:gap-4 pb-4 md:pb-0 min-w-max">
            {steps.map((step) => (
              <div key={step.number} className="flex items-center gap-2 shrink-0">
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
                <div className="hidden md:block min-w-0">
                  <p className="text-sm font-semibold truncate">{step.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Card className="shadow-lg">
          <CardContent className="pt-8">
            {children}
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground">
          <p>This information is required to complete your employment setup.</p>
          <p>All data is securely stored and used only for payroll and compliance purposes.</p>
        </div>
      </div>
    </div>
  )
}