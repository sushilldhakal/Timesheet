'use client'

import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useOnboarding } from '@/lib/context/onboarding-context'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { step5Schema } from '@/lib/validations/onboarding'

type Step5Data = z.infer<typeof step5Schema>

export function OnboardingStep5() {
  const { formData, setFormData, nextStep, prevStep } = useOnboarding()

  const fromYmd = (value?: string | null): Date | undefined => {
    if (!value) return undefined
    const d = new Date(`${value}T00:00:00`)
    return Number.isNaN(d.getTime()) ? undefined : d
  }

  const toYmd = (value?: Date): string => {
    if (!value) return ''
    return format(value, 'yyyy-MM-dd')
  }

  const form = useForm<Step5Data>({
    resolver: zodResolver(step5Schema),
    defaultValues: {
      contractType: formData.contractType,
      startDate: formData.startDate,
      endDate: formData.endDate,
      wageType: formData.wageType,
      salary: formData.salary,
      noticePeriod: formData.noticePeriod,
      probationPeriodEnd: formData.probationPeriodEnd,
    },
  })

  const wageType = form.watch('wageType')

  const onSubmit = (data: Step5Data) => {
    setFormData(data)
    nextStep()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Employment Contract</h2>
        <p className="text-muted-foreground">Set up the employment contract and remuneration.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField control={form.control} name="contractType" render={({ field }: any) => (
            <FormItem>
              <FormLabel>Contract Type *</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="fixed-term">Fixed-Term</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="startDate" render={({ field }: any) => {
            const endDate = form.watch('endDate')
            const endDateError = (form.formState.errors as any)?.endDate?.message as string | undefined

            return (
              <FormItem>
                <FormLabel>Start / End Dates *</FormLabel>
                <FormControl>
                  <DateRangePicker
                    dateRange={{ from: fromYmd(field.value), to: fromYmd(endDate) }}
                    onDateRangeChange={(range) => {
                      field.onChange(toYmd(range?.from))
                      form.setValue('endDate', toYmd(range?.to), { shouldValidate: true, shouldDirty: true })
                    }}
                    placeholder="Pick contract dates"
                  />
                </FormControl>
                <FormDescription>Only required for fixed-term contracts</FormDescription>
                <FormMessage />
                {endDateError ? <p className="text-sm font-medium text-destructive">{endDateError}</p> : null}
              </FormItem>
            )
          }} />

          <FormField control={form.control} name="wageType" render={({ field }: any) => (
            <FormItem>
              <FormLabel>Wage Type *</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="salary">Salary (Annual)</SelectItem>
                  <SelectItem value="hourly">Hourly Rate</SelectItem>
                  <SelectItem value="piecework">Piecework</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="salary" render={({ field }: any) => (
            <FormItem>
              <FormLabel>
                {wageType === 'salary' && 'Annual Salary (AUD) *'}
                {wageType === 'hourly' && 'Hourly Rate (AUD/hr) *'}
                {wageType === 'piecework' && 'Piecework Rate (AUD) *'}
              </FormLabel>
              <FormControl>
                <div className="flex items-center gap-2">
                  <span className="text-sm">AUD</span>
                  <Input type="number" placeholder="0.00" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} step={0.01} className="font-mono" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="noticePeriod" render={({ field }: any) => (
            <FormItem>
              <FormLabel>Notice Period (days)</FormLabel>
              <FormControl><Input type="number" placeholder="2" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} min={0} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="probationPeriodEnd" render={({ field }: any) => (
            <FormItem>
              <FormLabel>Probation Period End (Optional)</FormLabel>
              <FormControl>
                <DatePicker
                  date={fromYmd(field.value)}
                  onDateChange={(d) => field.onChange(toYmd(d))}
                  placeholder="Pick a date"
                />
              </FormControl>
              <FormDescription>Date when probation period ends</FormDescription>
              <FormMessage />
            </FormItem>
          )} />

          <div className="flex justify-between gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={prevStep}>&larr; Previous</Button>
            <Button type="submit">Next Step &rarr;</Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
