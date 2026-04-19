'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useOnboarding } from '@/lib/context/staff-onboarding-context'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export function StaffOnboardingStep7() {
  const { formData, prevStep } = useOnboarding()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Submit onboarding data to complete employee setup
      const response = await fetch('/api/employee/complete-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to complete onboarding')
      }

      toast.success('Onboarding completed successfully!')
      setIsComplete(true)
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/staff/dashboard')
      }, 2000)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to complete onboarding'
      setSubmitError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isComplete) {
    return (
      <div className="space-y-6 text-center py-12">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
        <div>
          <h2 className="text-2xl font-bold">Welcome to the Team!</h2>
          <p className="text-muted-foreground mt-2">
            Your onboarding is complete. Redirecting to your dashboard...
          </p>
        </div>
        <div className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Review & Submit</h2>
        <p className="text-muted-foreground">Please review your information before completing onboarding.</p>
      </div>

      {submitError && (
        <div className="flex items-center gap-2 bg-destructive/10 p-4 rounded-md text-destructive border border-destructive/20">
          <AlertCircle className="h-5 w-5" />
          {submitError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div><p className="text-muted-foreground">Name</p><p className="font-semibold">{formData.firstName} {formData.lastName}</p></div>
            <div><p className="text-muted-foreground">Email</p><p className="font-semibold">{formData.email || 'Not provided'}</p></div>
            <div><p className="text-muted-foreground">Phone</p><p className="font-semibold">{formData.phone || 'Not provided'}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Legal Details</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div><p className="text-muted-foreground">Legal Name</p><p className="font-semibold">{formData.legalFirstName} {formData.legalLastName}</p></div>
            <div><p className="text-muted-foreground">Nationality</p><p className="font-semibold">{formData.nationality || 'Not provided'}</p></div>
            <div><p className="text-muted-foreground">Time Zone</p><p className="font-semibold">{formData.timeZone}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Tax Information</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div><p className="text-muted-foreground">TFN</p><p className="font-semibold font-mono">{formData.tfn ? '***-***-' + formData.tfn.slice(-3) : 'Not provided'}</p></div>
            <div><p className="text-muted-foreground">Superannuation Fund</p><p className="font-semibold">{formData.superannuationFund || 'Not provided'}</p></div>
            <div><p className="text-muted-foreground">HELP Debt</p><p className="font-semibold">{formData.hasHelpDebt ? 'Yes' : 'No'}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Banking Details</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div><p className="text-muted-foreground">Bank</p><p className="font-semibold">{formData.bankName || 'Not provided'}</p></div>
            <div><p className="text-muted-foreground">Account</p><p className="font-semibold font-mono">{formData.accountNumber ? '****' + formData.accountNumber.slice(-4) : 'Not provided'}</p></div>
            <div><p className="text-muted-foreground">BSB</p><p className="font-semibold font-mono">{formData.bsbCode || 'Not provided'}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Employment Contract</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div><p className="text-muted-foreground">Type</p><Badge className="capitalize">{formData.contractType}</Badge></div>
            <div><p className="text-muted-foreground">Start Date</p><p className="font-semibold">{formData.startDate || 'Not set'}</p></div>
            <div><p className="text-muted-foreground">Salary/Rate</p><p className="font-mono">AUD ${formData.salary?.toLocaleString()}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Compliance Status</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div><p className="text-muted-foreground">WWC</p><Badge variant="outline" className="capitalize">{formData.wwcStatus}</Badge></div>
            <div><p className="text-muted-foreground">Police Clearance</p><Badge variant="outline" className="capitalize">{formData.policeClearanceStatus}</Badge></div>
            <div><p className="text-muted-foreground">Food Handling</p><Badge variant="outline" className="capitalize">{formData.foodHandlingStatus}</Badge></div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-blue-900">Ready to Complete Onboarding</p>
            <p className="text-blue-700 mt-1">
              By submitting this form, you confirm that all information provided is accurate and complete. 
              This information will be used for payroll, tax, and compliance purposes.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between gap-3 pt-6 border-t">
        <Button type="button" variant="outline" onClick={prevStep} disabled={isSubmitting} size="lg">
          &larr; Previous
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2" size="lg">
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Completing Onboarding...' : 'Complete Onboarding'}
        </Button>
      </div>
    </div>
  )
}