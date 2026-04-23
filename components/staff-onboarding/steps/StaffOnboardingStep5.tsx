'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useOnboarding } from '@/lib/context/staff-onboarding-context'
import { staffOnboardingStep5Schema, type StaffOnboardingStep5Data } from '@/lib/validations/staff-onboarding'
import { useState } from 'react'
import { Loader2, ChevronLeft, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { employeeClockKeys } from '@/lib/queries/employee-clock'

export function StaffOnboardingStep5() {
  const { formData, prevStep, onboardingCountry } = useOnboarding()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [consentGiven, setConsentGiven] = useState(false)
  const router = useRouter()
  const queryClient = useQueryClient()

  const {
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<StaffOnboardingStep5Data>({
    resolver: zodResolver(staffOnboardingStep5Schema),
    defaultValues: {
      consentGiven: false,
    },
  })

  const onSubmit = async (data: StaffOnboardingStep5Data) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/employee/complete-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          consentGiven: data.consentGiven,
        }),
      })

      // 400 "already completed" means the employee is done — treat as success
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        if (response.status !== 400 || body?.error !== 'Onboarding already completed') {
          throw new Error(body?.error || 'Failed to complete onboarding')
        }
      }

      // Bust the stale profile cache so the onboarding page redirect fires
      await queryClient.invalidateQueries({ queryKey: employeeClockKeys.profile })
      router.replace('/staff/dashboard')
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
      alert('Failed to complete onboarding. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-semibold">Review & Submit</h2>
        <p className="text-sm text-muted-foreground">
          Please review your information before submitting
        </p>
      </div>

      {/* Personal Details Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Personal Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <p className="text-muted-foreground">Legal Name</p>
              <p className="font-medium">
                {formData.legalFirstName} {formData.legalMiddleNames} {formData.legalLastName}
              </p>
            </div>
            {formData.preferredName && (
              <div>
                <p className="text-muted-foreground">Preferred Name</p>
                <p className="font-medium">{formData.preferredName}</p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <p className="text-muted-foreground">Date of Birth</p>
              <p className="font-medium">{formData.dob}</p>
            </div>
            {formData.gender && (
              <div>
                <p className="text-muted-foreground">Gender</p>
                <p className="font-medium capitalize">{formData.gender}</p>
              </div>
            )}
          </div>
          <div>
            <p className="text-muted-foreground">Address</p>
            <p className="font-medium">
              {formData.addressLine1}
              {formData.addressLine2 && `, ${formData.addressLine2}`}
              <br />
              {formData.city}, {formData.state} {formData.postcode}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Emergency Contact</p>
            <p className="font-medium">
              {formData.emergencyContactName} ({formData.emergencyContactRelationship})
              <br />
              {formData.emergencyContactPhone}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Work Eligibility Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Work Eligibility
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <p className="text-muted-foreground">Country</p>
            <p className="font-medium">{onboardingCountry}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Work Rights</p>
            <p className="font-medium capitalize">{formData.workRightsType?.replace('_', ' ')}</p>
          </div>
          {formData.visaSubclass && (
            <div>
              <p className="text-muted-foreground">Visa Details</p>
              <p className="font-medium">
                Subclass {formData.visaSubclass}
                {formData.maxHoursPerFortnight && ` (Max ${formData.maxHoursPerFortnight} hrs/fortnight)`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tax Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Tax Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {onboardingCountry === 'AU' && (
            <>
              <div>
                <p className="text-muted-foreground">TFN</p>
                <p className="font-medium">{formData.tfn ? '***-***-' + formData.tfn.slice(-3) : 'Not provided'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tax-free threshold</p>
                <p className="font-medium">{formData.taxFreeThreshold ? 'Claimed' : 'Not claimed'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">HELP debt</p>
                <p className="font-medium">{formData.hasHelpDebt ? 'Yes' : 'No'}</p>
              </div>
            </>
          )}
          {onboardingCountry === 'NP' && (
            <div>
              <p className="text-muted-foreground">PAN</p>
              <p className="font-medium">{formData.panNepal || 'Not provided'}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Banking Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Banking Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {onboardingCountry === 'AU' && (
            <>
              <div>
                <p className="text-muted-foreground">Bank</p>
                <p className="font-medium">{formData.bankName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Account</p>
                <p className="font-medium">
                  BSB: ***-{formData.bsbCode?.slice(-3)} | Account: ****{formData.accountNumber?.slice(-4)}
                </p>
              </div>
              {formData.superFundName && (
                <div>
                  <p className="text-muted-foreground">Super Fund</p>
                  <p className="font-medium">{formData.superFundName}</p>
                </div>
              )}
            </>
          )}
          {onboardingCountry === 'NP' && (
            <>
              <div>
                <p className="text-muted-foreground">Bank</p>
                <p className="font-medium">{formData.nepalBankName} - {formData.nepalBranch}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Account</p>
                <p className="font-medium">****{formData.nepalAccountNumber?.slice(-4)}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Consent */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="consent"
              checked={consentGiven}
              onCheckedChange={(checked) => {
                const val = checked as boolean
                setConsentGiven(val)
                setValue('consentGiven', val, { shouldValidate: true })
              }}
              className="mt-1"
            />
            <div className="flex-1">
              <Label htmlFor="consent" className="cursor-pointer font-medium text-sm sm:text-base">
                I confirm that all information provided is accurate and complete *
              </Label>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                By submitting this form, I consent to the collection, storage, and processing of my personal information for employment and payroll purposes. I understand that providing false or misleading information may result in termination of employment.
              </p>
            </div>
          </div>
          {errors.consentGiven && (
            <p className="text-xs text-red-500 mt-2">{errors.consentGiven.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-4">
        <Button type="button" variant="outline" onClick={prevStep} className="w-full sm:w-auto">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !consentGiven}
          className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Complete Onboarding
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
