'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker } from '@/components/ui/date-picker'
import { useOnboarding } from '@/lib/context/staff-onboarding-context'
import { staffOnboardingStep2Schema, type StaffOnboardingStep2Data } from '@/lib/validations/staff-onboarding'
import { useState } from 'react'
import { Loader2, ChevronLeft, AlertCircle, Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function StaffOnboardingStep2() {
  const { formData, setFormData, nextStep, prevStep, onboardingCountry } = useOnboarding()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StaffOnboardingStep2Data>({
    resolver: zodResolver(staffOnboardingStep2Schema),
    defaultValues: {
      country: onboardingCountry,
      workRightsType: formData.workRightsType || '',
      australianIdType: (formData.australianIdType as any) || undefined,
      australianIdNumber: formData.australianIdNumber || '',
      passportNumber: formData.passportNumber || '',
      passportExpiry: formData.passportExpiry || '',
      visaSubclass: formData.visaSubclass || '',
      visaGrantNumber: formData.visaGrantNumber || '',
      visaWorkConditions: formData.visaWorkConditions || '',
      maxHoursPerFortnight: formData.maxHoursPerFortnight || undefined,
      citizenshipCertNumber: formData.citizenshipCertNumber || '',
      citizenshipIssuedDistrict: formData.citizenshipIssuedDistrict || '',
      citizenshipIssuedDate: formData.citizenshipIssuedDate || '',
      nationalIdNumber: formData.nationalIdNumber || '',
      workPermitNumber: formData.workPermitNumber || '',
      workPermitExpiry: formData.workPermitExpiry || '',
      tfn: formData.tfn || '',
      taxFreeThreshold: formData.taxFreeThreshold ?? true,
      residencyStatusAU: formData.residencyStatusAU || 'resident',
      hasHelpDebt: formData.hasHelpDebt ?? false,
      panNepal: formData.panNepal || '',
    },
  })

  // Drive all conditional rendering from watch — not separate useState
  const workRightsType = watch('workRightsType') || ''
  const australianIdType = watch('australianIdType') || ''
  const taxFreeThreshold = watch('taxFreeThreshold') ?? true
  const hasHelpDebt = watch('hasHelpDebt') ?? false
  const auCitizenOrResident = workRightsType === 'au_citizen' || workRightsType === 'au_resident'

  const fromYmd = (value?: string | null): Date | undefined => {
    if (!value) return undefined
    const d = new Date(`${value}T00:00:00`)
    return Number.isNaN(d.getTime()) ? undefined : d
  }

  const toYmd = (value?: Date): string => {
    if (!value) return ''
    return format(value, 'yyyy-MM-dd')
  }

  const onSubmit = async (data: StaffOnboardingStep2Data) => {
    setIsSubmitting(true)
    try {
      await fetch('/api/employee/onboarding-progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 2, data }),
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-semibold">Work Eligibility & Tax</h2>
        <p className="text-sm text-muted-foreground">
          {onboardingCountry === 'AU' && 'Verify your right to work in Australia and provide your tax details'}
          {onboardingCountry === 'NP' && 'Verify your citizenship and provide your tax details'}
          {onboardingCountry === 'NZ' && 'Verify your right to work in New Zealand and provide your tax details'}
          {onboardingCountry === 'IN' && 'Verify your identity and provide your tax details'}
        </p>
      </div>

      {/* AUSTRALIA */}
      {onboardingCountry === 'AU' && (
        <>
          <div className="space-y-4">
            <h3 className="text-base font-semibold">Work Rights</h3>
            <RadioGroup
              value={workRightsType}
              onValueChange={(value) => {
                setValue('workRightsType', value, { shouldValidate: true })
                setFormData({ workRightsType: value })
              }}
              className="space-y-3"
            >
              {[
                { value: 'au_citizen', label: 'Australian Citizen', desc: 'Born in Australia or naturalized citizen' },
                { value: 'au_resident', label: 'Permanent Resident', desc: 'Hold a permanent residency visa' },
                { value: 'visa_holder', label: 'Visa Holder', desc: 'Temporary visa with work rights' },
              ].map((opt) => (
                <div key={opt.value} className="flex items-start space-x-3 p-3 sm:p-4 border rounded-lg hover:bg-accent cursor-pointer">
                  <RadioGroupItem value={opt.value} id={opt.value} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={opt.value} className="cursor-pointer font-medium">{opt.label}</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">{opt.desc}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
            {errors.workRightsType && <p className="text-xs text-red-500">{errors.workRightsType.message}</p>}
          </div>

          {/* AU Citizen / PR — ID document */}
          {auCitizenOrResident && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h3 className="text-sm font-semibold">Identity Document</h3>
              <p className="text-xs text-muted-foreground">Provide one of the following to verify your identity.</p>

              <div className="space-y-2">
                <Label>Document Type *</Label>
                <Select
                  value={australianIdType}
                  onValueChange={(val) => {
                    setValue('australianIdType', val as any, { shouldValidate: true })
                    setValue('australianIdNumber', '', { shouldValidate: false })
                    setFormData({ australianIdType: val, australianIdNumber: '' })
                  }}
                >
                  <SelectTrigger className={errors.australianIdType ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medicare">Medicare Card</SelectItem>
                    <SelectItem value="drivers_licence">Driver's Licence</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                  </SelectContent>
                </Select>
                {errors.australianIdType && <p className="text-xs text-red-500">{errors.australianIdType.message}</p>}
              </div>

              {/* Driver's Licence fields */}
              {australianIdType === 'drivers_licence' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="australianIdNumber">Licence Number *</Label>
                      <Input
                        id="australianIdNumber"
                        {...register('australianIdNumber')}
                        placeholder="e.g. 12345678"
                        className={errors.australianIdNumber ? 'border-red-500' : ''}
                      />
                      {errors.australianIdNumber && <p className="text-xs text-red-500">{errors.australianIdNumber.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="licenceIssuedState">Issued State *</Label>
                      <Select
                        value={watch('licenceIssuedState' as any) || ''}
                        onValueChange={(val) => {
                          setValue('licenceIssuedState' as any, val)
                          setFormData({ licenceIssuedState: val } as any)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {['ACT','NSW','NT','QLD','SA','TAS','VIC','WA'].map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="licenceExpiry">Expiry Date *</Label>
                      <DatePicker
                        date={fromYmd(watch('licenceExpiry' as any))}
                        onDateChange={(d) => setValue('licenceExpiry' as any, toYmd(d), { shouldValidate: true, shouldDirty: true })}
                        placeholder="Pick a date"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="licenceCardNumber">Card Number (back of licence)</Label>
                      <Input
                        id="licenceCardNumber"
                        {...register('licenceCardNumber' as any)}
                        placeholder="e.g. 10987654"
                      />
                      <p className="text-xs text-muted-foreground">The identifier printed on the back</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Passport fields (AU citizen/PR using passport as ID) */}
              {australianIdType === 'passport' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="australianIdNumber">Passport Number *</Label>
                    <Input
                      id="australianIdNumber"
                      {...register('australianIdNumber')}
                      placeholder="e.g. PA1234567"
                      className={errors.australianIdNumber ? 'border-red-500' : ''}
                    />
                    {errors.australianIdNumber && <p className="text-xs text-red-500">{errors.australianIdNumber.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passportExpiry">Expiry Date *</Label>
                    <DatePicker
                      date={fromYmd(watch('passportExpiry'))}
                      onDateChange={(d) => setValue('passportExpiry', toYmd(d), { shouldValidate: true, shouldDirty: true })}
                      placeholder="Pick a date"
                      disabled={isSubmitting}
                      className={errors.passportExpiry ? 'border-red-500' : ''}
                    />
                    {errors.passportExpiry && <p className="text-xs text-red-500">{errors.passportExpiry.message}</p>}
                  </div>
                </div>
              )}

              {/* Medicare fields */}
              {australianIdType === 'medicare' && (
                <div className="space-y-2">
                  <Label htmlFor="australianIdNumber">Medicare Card Number *</Label>
                  <Input
                    id="australianIdNumber"
                    {...register('australianIdNumber')}
                    placeholder="2345 67890 1"
                    className={errors.australianIdNumber ? 'border-red-500' : ''}
                  />
                  {errors.australianIdNumber && <p className="text-xs text-red-500">{errors.australianIdNumber.message}</p>}
                </div>
              )}
            </div>
          )}

          {/* AU Visa Holder */}
          {workRightsType === 'visa_holder' && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs sm:text-sm">
                  Your visa details will be verified via VEVO by HR.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="passportIssuingCountry">Passport Issuing Country *</Label>
                  <Input
                    id="passportIssuingCountry"
                    {...register('passportIssuingCountry' as any)}
                    placeholder="e.g. India, Philippines"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passportNumber">Passport Number *</Label>
                  <Input id="passportNumber" {...register('passportNumber')} className={errors.passportNumber ? 'border-red-500' : ''} />
                  {errors.passportNumber && <p className="text-xs text-red-500">{errors.passportNumber.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="passportExpiry">Passport Expiry *</Label>
                  <DatePicker
                    date={fromYmd(watch('passportExpiry'))}
                    onDateChange={(d) => setValue('passportExpiry', toYmd(d), { shouldValidate: true, shouldDirty: true })}
                    placeholder="Pick a date"
                    disabled={isSubmitting}
                    className={errors.passportExpiry ? 'border-red-500' : ''}
                  />
                  {errors.passportExpiry && <p className="text-xs text-red-500">{errors.passportExpiry.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visaSubclass">Visa Subclass *</Label>
                  <Input id="visaSubclass" {...register('visaSubclass')} placeholder="e.g., 482, 457, 417" className={errors.visaSubclass ? 'border-red-500' : ''} />
                  {errors.visaSubclass && <p className="text-xs text-red-500">{errors.visaSubclass.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="visaGrantNumber">Visa Grant Number *</Label>
                  <Input id="visaGrantNumber" {...register('visaGrantNumber')} className={errors.visaGrantNumber ? 'border-red-500' : ''} />
                  {errors.visaGrantNumber && <p className="text-xs text-red-500">{errors.visaGrantNumber.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxHoursPerFortnight">Max Hours / Fortnight</Label>
                  <Input id="maxHoursPerFortnight" type="number" {...register('maxHoursPerFortnight', { valueAsNumber: true })} placeholder="e.g., 40" />
                  <p className="text-xs text-muted-foreground">Leave blank if no restriction</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="visaWorkConditions">Visa Work Conditions</Label>
                <Textarea id="visaWorkConditions" {...register('visaWorkConditions')} placeholder="Any work restrictions on your visa" rows={3} className="resize-none" />
              </div>
            </div>
          )}

          {/* AU Tax */}
          {workRightsType && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold">Tax Information</h3>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs sm:text-sm">
                  Your TFN is optional but without it you'll be taxed at the highest rate.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="tfn">Tax File Number (TFN)</Label>
                <Input id="tfn" {...register('tfn')} placeholder="123 456 789" maxLength={11} className={errors.tfn ? 'border-red-500' : ''} />
                {errors.tfn && <p className="text-xs text-red-500">{errors.tfn.message}</p>}
                <p className="text-xs text-muted-foreground">8 or 9 digits (spaces optional)</p>
              </div>

              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="taxFreeThreshold"
                    checked={taxFreeThreshold}
                    onCheckedChange={(checked) => {
                      setValue('taxFreeThreshold', checked as boolean)
                      setFormData({ taxFreeThreshold: checked as boolean })
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="taxFreeThreshold" className="cursor-pointer font-medium">Claim the tax-free threshold</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Tick if this is your main job. You can only claim from one employer at a time.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="hasHelpDebt"
                    checked={hasHelpDebt}
                    onCheckedChange={(checked) => {
                      setValue('hasHelpDebt', checked as boolean)
                      setFormData({ hasHelpDebt: checked as boolean })
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="hasHelpDebt" className="cursor-pointer font-medium">I have a HELP, VSL, SFSS, SSL or TSL debt</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">Higher Education Loan Program or similar study/training loan</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* NEPAL */}
      {onboardingCountry === 'NP' && (
        <>
          <div className="space-y-4">
            <h3 className="text-base font-semibold">Citizenship Status</h3>
            <RadioGroup
              value={workRightsType}
              onValueChange={(value) => {
                setValue('workRightsType', value, { shouldValidate: true })
                setFormData({ workRightsType: value })
              }}
              className="space-y-3"
            >
              {[
                { value: 'nepali_citizen', label: 'Nepali Citizen', desc: 'Hold Nepali citizenship certificate' },
                { value: 'foreign_national', label: 'Foreign National', desc: 'Foreign citizen with work permit' },
              ].map((opt) => (
                <div key={opt.value} className="flex items-start space-x-3 p-3 sm:p-4 border rounded-lg hover:bg-accent cursor-pointer">
                  <RadioGroupItem value={opt.value} id={opt.value} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={opt.value} className="cursor-pointer font-medium">{opt.label}</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">{opt.desc}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
            {errors.workRightsType && <p className="text-xs text-red-500">{errors.workRightsType.message}</p>}
          </div>

          {workRightsType === 'nepali_citizen' && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="citizenshipCertNumber">Citizenship Certificate Number *</Label>
                <Input id="citizenshipCertNumber" {...register('citizenshipCertNumber')} className={errors.citizenshipCertNumber ? 'border-red-500' : ''} />
                {errors.citizenshipCertNumber && <p className="text-xs text-red-500">{errors.citizenshipCertNumber.message}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="citizenshipIssuedDistrict">Issued District *</Label>
                  <Input id="citizenshipIssuedDistrict" {...register('citizenshipIssuedDistrict')} placeholder="e.g., Kathmandu" className={errors.citizenshipIssuedDistrict ? 'border-red-500' : ''} />
                  {errors.citizenshipIssuedDistrict && <p className="text-xs text-red-500">{errors.citizenshipIssuedDistrict.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="citizenshipIssuedDate">Issued Date *</Label>
                  <DatePicker
                    date={fromYmd(watch('citizenshipIssuedDate'))}
                    onDateChange={(d) => setValue('citizenshipIssuedDate', toYmd(d), { shouldValidate: true, shouldDirty: true })}
                    placeholder="Pick a date"
                    disabled={isSubmitting}
                    className={errors.citizenshipIssuedDate ? 'border-red-500' : ''}
                  />
                  {errors.citizenshipIssuedDate && <p className="text-xs text-red-500">{errors.citizenshipIssuedDate.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nationalIdNumber">National ID Number (NIN)</Label>
                <Input id="nationalIdNumber" {...register('nationalIdNumber')} placeholder="Optional" />
              </div>
            </div>
          )}

          {workRightsType === 'foreign_national' && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="passportNumber">Passport Number *</Label>
                  <Input id="passportNumber" {...register('passportNumber')} className={errors.passportNumber ? 'border-red-500' : ''} />
                  {errors.passportNumber && <p className="text-xs text-red-500">{errors.passportNumber.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workPermitNumber">Work Permit Number *</Label>
                  <Input id="workPermitNumber" {...register('workPermitNumber')} className={errors.workPermitNumber ? 'border-red-500' : ''} />
                  {errors.workPermitNumber && <p className="text-xs text-red-500">{errors.workPermitNumber.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="workPermitExpiry">Work Permit Expiry</Label>
                <DatePicker
                  date={fromYmd(watch('workPermitExpiry'))}
                  onDateChange={(d) => setValue('workPermitExpiry', toYmd(d), { shouldValidate: true, shouldDirty: true })}
                  placeholder="Pick a date"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}

          {workRightsType && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold">Tax Information</h3>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs sm:text-sm">PAN is optional but recommended for tax purposes.</AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="panNepal">PAN (Permanent Account Number)</Label>
                <Input id="panNepal" {...register('panNepal')} placeholder="123456789" className={errors.panNepal ? 'border-red-500' : ''} />
                {errors.panNepal && <p className="text-xs text-red-500">{errors.panNepal.message}</p>}
                <p className="text-xs text-muted-foreground">9-digit PAN issued by Inland Revenue Department</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* NZ / IN placeholder */}
      {(onboardingCountry === 'NZ' || onboardingCountry === 'IN') && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {onboardingCountry === 'NZ' && 'New Zealand onboarding flow coming soon. Please contact HR for assistance.'}
            {onboardingCountry === 'IN' && 'India onboarding flow coming soon. Please contact HR for assistance.'}
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
          {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Next'}
        </Button>
      </div>
    </form>
  )
}
