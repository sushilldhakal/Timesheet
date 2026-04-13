'use client'

import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useOnboarding } from '@/lib/context/onboarding-context'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const step5Schema = z.object({
  contractType: z.enum(['permanent', 'fixed-term', 'casual', 'contractor']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional().or(z.literal('')),
  wageType: z.enum(['salary', 'hourly', 'piecework']),
  salary: z.number().min(0, 'Salary must be 0 or greater'),
  noticePeriod: z.number().min(0).max(365),
  probationPeriodEnd: z.string().optional().or(z.literal('')),
})

type Step5Data = z.infer<typeof step5Schema>

export function OnboardingStep5() {
  const { formData, setFormData, nextStep, prevStep } = useOnboarding()

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
          <FormField control={form.control} name="contractType" render={({ field }) => (
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

          <FormField control={form.control} name="startDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Start Date *</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="endDate" render={({ field }) => (
            <FormItem>
              <FormLabel>End Date (Optional)</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormDescription>Only for fixed-term contracts</FormDescription>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="wageType" render={({ field }) => (
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

          <FormField control={form.control} name="salary" render={({ field }) => (
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

          <FormField control={form.control} name="noticePeriod" render={({ field }) => (
            <FormItem>
              <FormLabel>Notice Period (days)</FormLabel>
              <FormControl><Input type="number" placeholder="2" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} min={0} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="probationPeriodEnd" render={({ field }) => (
            <FormItem>
              <FormLabel>Probation Period End (Optional)</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
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
