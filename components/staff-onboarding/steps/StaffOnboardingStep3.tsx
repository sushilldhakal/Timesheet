'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useOnboarding } from '@/lib/context/staff-onboarding-context'
import { staffOnboardingStep3Schema, type StaffOnboardingStep3Data } from '@/lib/validations/staff-onboarding'
import { useState } from 'react'
import { Loader2, ChevronLeft, AlertCircle, Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function StaffOnboardingStep3() {
  const { formData, setFormData, nextStep, prevStep, onboardingCountry } = useOnboarding()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm<StaffOnboardingStep3Data>({
    resolver: zodResolver(staffOnboardingStep3Schema),
    defaultValues: {
      country: onboardingCountry,
      bankName: formData.bankName,
      bsbCode: formData.bsbCode,
      accountNumber: formData.accountNumber,
      accountHolderName: formData.accountHolderName,
      accountType: formData.accountType || 'savings',
      superFundName: formData.superFundName,
      superUSI: formData.superUSI,
      superMemberNumber: formData.superMemberNumber,
      nepalBankName: formData.nepalBankName,
      nepalBranch: formData.nepalBranch,
      nepalAccountNumber: formData.nepalAccountNumber,
      ssfNumber: formData.ssfNumber,
    },
  })

  const accountType = watch('accountType') || formData.accountType || 'savings'

  const onSubmit = async (data: StaffOnboardingStep3Data) => {
    setIsSubmitting(true)
    try {
      await fetch('/api/employee/onboarding-progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 3, data }),
      })

      setFormData(data as any)
      nextStep()
    } catch (error) {
      console.error('Failed to save progress:', error)
      alert('Failed to save progress. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground sm:text-2xl">Banking & Superannuation</h2>
        <p className="text-sm text-muted-foreground">
          {onboardingCountry === 'AU' && 'Provide your bank account and superannuation details for payroll'}
          {onboardingCountry === 'NP' && 'Provide your bank account details for salary payment'}
          {onboardingCountry === 'NZ' && 'Provide your bank account and KiwiSaver details'}
          {onboardingCountry === 'IN' && 'Provide your bank account and PF details'}
        </p>
      </div>

      {/* Australia Banking & Super */}
      {onboardingCountry === 'AU' && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-medium">Bank Account Details</h3>
            
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name *</Label>
              <Input
                id="bankName"
                {...register('bankName')}
                placeholder="e.g., Commonwealth Bank"
                className={errors.bankName ? 'border-red-500' : ''}
              />
              {errors.bankName && (
                <p className="text-xs text-red-500">{errors.bankName.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bsbCode">BSB *</Label>
                <Input
                  id="bsbCode"
                  {...register('bsbCode')}
                  placeholder="123-456"
                  maxLength={7}
                  className={errors.bsbCode ? 'border-red-500' : ''}
                />
                {errors.bsbCode && (
                  <p className="text-xs text-red-500">{errors.bsbCode.message}</p>
                )}
                <p className="text-xs text-muted-foreground">6 digits (format: XXX-XXX)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number *</Label>
                <Input
                  id="accountNumber"
                  {...register('accountNumber')}
                  placeholder="12345678"
                  className={errors.accountNumber ? 'border-red-500' : ''}
                />
                {errors.accountNumber && (
                  <p className="text-xs text-red-500">{errors.accountNumber.message}</p>
                )}
                <p className="text-xs text-muted-foreground">6-10 digits</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountHolderName">Account Holder Name *</Label>
                <Input
                  id="accountHolderName"
                  {...register('accountHolderName')}
                  placeholder="As shown on your bank account"
                  className={errors.accountHolderName ? 'border-red-500' : ''}
                />
                {errors.accountHolderName && (
                  <p className="text-xs text-red-500">{errors.accountHolderName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountType">Account Type *</Label>
                <Select
                  value={accountType}
                  onValueChange={(value: 'savings' | 'cheque') => {
                    setValue('accountType', value)
                    setFormData({ accountType: value })
                  }}
                >
                  <SelectTrigger id="accountType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs sm:text-sm">
                Your bank details are encrypted and securely stored. Only the last 4 digits will be visible to staff.
              </AlertDescription>
            </Alert>
          </div>

          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-medium">Superannuation</h3>
            
            <div className="space-y-2">
              <Label htmlFor="superFundName">Super Fund Name</Label>
              <Input
                id="superFundName"
                {...register('superFundName')}
                placeholder="e.g., Australian Super"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank if you want us to set up a default fund
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="superUSI">Super Fund USI</Label>
                <Input
                  id="superUSI"
                  {...register('superUSI')}
                  placeholder="Unique Superannuation Identifier"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="superMemberNumber">Member Number</Label>
                <Input
                  id="superMemberNumber"
                  {...register('superMemberNumber')}
                  placeholder="Your member number"
                />
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs sm:text-sm">
                If you don't have a super fund, we'll set up a default fund for you as required by law.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      {/* Nepal Banking */}
      {onboardingCountry === 'NP' && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-medium">Bank Account Details</h3>
            
            <div className="space-y-2">
              <Label htmlFor="nepalBankName">Bank Name *</Label>
              <Input
                id="nepalBankName"
                {...register('nepalBankName')}
                placeholder="e.g., Nepal Bank Limited"
                className={errors.nepalBankName ? 'border-red-500' : ''}
              />
              {errors.nepalBankName && (
                <p className="text-xs text-red-500">{errors.nepalBankName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nepalBranch">Branch *</Label>
              <Input
                id="nepalBranch"
                {...register('nepalBranch')}
                placeholder="e.g., Kathmandu Main Branch"
                className={errors.nepalBranch ? 'border-red-500' : ''}
              />
              {errors.nepalBranch && (
                <p className="text-xs text-red-500">{errors.nepalBranch.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nepalAccountNumber">Account Number *</Label>
              <Input
                id="nepalAccountNumber"
                {...register('nepalAccountNumber')}
                placeholder="Your bank account number"
                className={errors.nepalAccountNumber ? 'border-red-500' : ''}
              />
              {errors.nepalAccountNumber && (
                <p className="text-xs text-red-500">{errors.nepalAccountNumber.message}</p>
              )}
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs sm:text-sm">
                Your salary will be deposited directly to this account.
              </AlertDescription>
            </Alert>
          </div>

          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-medium">Social Security Fund (SSF)</h3>
            
            <div className="space-y-2">
              <Label htmlFor="ssfNumber">SSF Number</Label>
              <Input
                id="ssfNumber"
                {...register('ssfNumber')}
                placeholder="Your SSF registration number"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank if you don't have an SSF number yet
              </p>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs sm:text-sm">
                If you don't have an SSF number, we'll help you register as required by law.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      {/* Placeholder for NZ and IN */}
      {(onboardingCountry === 'NZ' || onboardingCountry === 'IN') && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {onboardingCountry === 'NZ' && 'New Zealand banking setup coming soon. Please contact HR for assistance.'}
            {onboardingCountry === 'IN' && 'India banking setup coming soon. Please contact HR for assistance.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation */}
      <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-4">
        <Button type="button" variant="outline" onClick={prevStep} className="w-full sm:w-auto">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Next'
          )}
        </Button>
      </div>
    </form>
  )
}
