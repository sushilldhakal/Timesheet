'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useOnboarding } from '@/lib/context/staff-onboarding-context'
import { staffOnboardingStep1Schema, type StaffOnboardingStep1Data } from '@/lib/validations/staff-onboarding'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export function StaffOnboardingStep1() {
  const { formData, setFormData, nextStep } = useOnboarding()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm<StaffOnboardingStep1Data>({
    resolver: zodResolver(staffOnboardingStep1Schema),
    defaultValues: {
      legalFirstName: formData.legalFirstName,
      legalLastName: formData.legalLastName,
      legalMiddleNames: formData.legalMiddleNames,
      preferredName: formData.preferredName,
      dob: formData.dob,
      gender: formData.gender,
      addressLine1: formData.addressLine1,
      addressLine2: formData.addressLine2,
      city: formData.city,
      state: formData.state,
      postcode: formData.postcode,
      country: formData.country || 'Australia',
      emergencyContactName: formData.emergencyContactName,
      emergencyContactRelationship: formData.emergencyContactRelationship,
      emergencyContactPhone: formData.emergencyContactPhone,
    },
  })

  const fromYmd = (value?: string | null): Date | undefined => {
    if (!value) return undefined
    const d = new Date(`${value}T00:00:00`)
    return Number.isNaN(d.getTime()) ? undefined : d
  }

  const toYmd = (value?: Date): string => {
    if (!value) return ''
    return format(value, 'yyyy-MM-dd')
  }

  const onSubmit = async (data: StaffOnboardingStep1Data) => {
    setIsSubmitting(true)
    try {
      // Save progress to API
      await fetch('/api/employee/onboarding-progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 1, data }),
      })

      setFormData(data)
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
        <h2 className="text-xl font-semibold text-foreground sm:text-2xl">Personal Details</h2>
        <p className="text-sm text-muted-foreground">Please provide your legal name and contact information</p>
      </div>

      {/* Legal Name Section */}
      <div className="space-y-4">
        <h3 className="text-base sm:text-lg font-medium">Legal Name</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="legalFirstName">Legal First Name *</Label>
            <Input
              id="legalFirstName"
              {...register('legalFirstName')}
              className={errors.legalFirstName ? 'border-red-500' : ''}
            />
            {errors.legalFirstName && (
              <p className="text-xs text-red-500">{errors.legalFirstName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="legalLastName">Legal Last Name *</Label>
            <Input
              id="legalLastName"
              {...register('legalLastName')}
              className={errors.legalLastName ? 'border-red-500' : ''}
            />
            {errors.legalLastName && (
              <p className="text-xs text-red-500">{errors.legalLastName.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="legalMiddleNames">Middle Name(s)</Label>
            <Input id="legalMiddleNames" {...register('legalMiddleNames')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredName">Preferred Name</Label>
            <Input id="preferredName" {...register('preferredName')} />
            <p className="text-xs text-muted-foreground">If different from legal name</p>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="space-y-4">
        <h3 className="text-base sm:text-lg font-medium">Personal Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dob">Date of Birth *</Label>
            <DatePicker
              date={fromYmd(watch('dob'))}
              onDateChange={(d) => setValue('dob', toYmd(d), { shouldValidate: true, shouldDirty: true })}
              placeholder="Pick a date"
              disabled={isSubmitting}
              className={errors.dob ? 'border-red-500' : ''}
            />
            {errors.dob && (
              <p className="text-xs text-red-500">{errors.dob.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select
              value={formData.gender}
              onValueChange={(value) => {
                setValue('gender', value)
                setFormData({ gender: value })
              }}
            >
              <SelectTrigger id="gender">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-4">
        <h3 className="text-base sm:text-lg font-medium">Home Address</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="addressLine1">Address Line 1 *</Label>
            <Input
              id="addressLine1"
              {...register('addressLine1')}
              placeholder="Street address"
              className={errors.addressLine1 ? 'border-red-500' : ''}
            />
            {errors.addressLine1 && (
              <p className="text-xs text-red-500">{errors.addressLine1.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="addressLine2">Address Line 2</Label>
            <Input
              id="addressLine2"
              {...register('addressLine2')}
              placeholder="Apartment, suite, etc."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                {...register('city')}
                className={errors.city ? 'border-red-500' : ''}
              />
              {errors.city && (
                <p className="text-xs text-red-500">{errors.city.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                {...register('state')}
                className={errors.state ? 'border-red-500' : ''}
              />
              {errors.state && (
                <p className="text-xs text-red-500">{errors.state.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="postcode">Postcode *</Label>
              <Input
                id="postcode"
                {...register('postcode')}
                className={errors.postcode ? 'border-red-500' : ''}
              />
              {errors.postcode && (
                <p className="text-xs text-red-500">{errors.postcode.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country *</Label>
            <Input
              id="country"
              {...register('country')}
              className={errors.country ? 'border-red-500' : ''}
            />
            {errors.country && (
              <p className="text-xs text-red-500">{errors.country.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="space-y-4">
        <h3 className="text-base sm:text-lg font-medium">Emergency Contact</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emergencyContactName">Contact Name *</Label>
            <Input
              id="emergencyContactName"
              {...register('emergencyContactName')}
              className={errors.emergencyContactName ? 'border-red-500' : ''}
            />
            {errors.emergencyContactName && (
              <p className="text-xs text-red-500">{errors.emergencyContactName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergencyContactRelationship">Relationship *</Label>
            <Input
              id="emergencyContactRelationship"
              {...register('emergencyContactRelationship')}
              placeholder="e.g., Spouse, Parent, Sibling"
              className={errors.emergencyContactRelationship ? 'border-red-500' : ''}
            />
            {errors.emergencyContactRelationship && (
              <p className="text-xs text-red-500">{errors.emergencyContactRelationship.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergencyContactPhone">Contact Phone *</Label>
            <Input
              id="emergencyContactPhone"
              type="tel"
              {...register('emergencyContactPhone')}
              className={errors.emergencyContactPhone ? 'border-red-500' : ''}
            />
            {errors.emergencyContactPhone && (
              <p className="text-xs text-red-500">{errors.emergencyContactPhone.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-4">
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
