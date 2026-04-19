'use client'

import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useOnboarding } from '@/lib/context/onboarding-context'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { step3Schema } from '@/lib/validations/onboarding'

type Step3Data = z.infer<typeof step3Schema>

export function OnboardingStep3() {
  const { formData, setFormData, nextStep, prevStep } = useOnboarding()

  const form = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      tfn: formData.tfn,
      abn: formData.abn,
      superannuationFund: formData.superannuationFund,
      superannuationMemberNumber: formData.superannuationMemberNumber,
      taxWithholdingPercentage: formData.taxWithholdingPercentage,
      hasHelpDebt: formData.hasHelpDebt,
    },
  })

  const onSubmit = (data: Step3Data) => {
    setFormData(data)
    nextStep()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Tax Information</h2>
        <p className="text-muted-foreground">Provide tax file number and superannuation details.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField control={form.control} name="tfn" render={({ field }: any) => (
            <FormItem>
              <FormLabel>Tax File Number (TFN) - Optional</FormLabel>
              <FormControl><Input placeholder="11 digits" {...field} maxLength={11} className="font-mono" /></FormControl>
              <FormDescription>Will be encrypted and stored securely</FormDescription>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="abn" render={({ field }: any) => (
            <FormItem>
              <FormLabel>Australian Business Number (ABN) - Optional</FormLabel>
              <FormControl><Input placeholder="11 digits" {...field} maxLength={11} className="font-mono" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="superannuationFund" render={({ field }: any) => (
            <FormItem>
              <FormLabel>Superannuation Fund Name - Optional</FormLabel>
              <FormControl><Input placeholder="e.g., AustralianSuper" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="superannuationMemberNumber" render={({ field }: any) => (
            <FormItem>
              <FormLabel>Superannuation Member Number - Optional</FormLabel>
              <FormControl><Input placeholder="Member ID" {...field} className="font-mono" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="taxWithholdingPercentage" render={({ field }: any) => (
            <FormItem>
              <FormLabel>Tax Withholding Percentage</FormLabel>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Input type="number" placeholder="0" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} min={0} max={100} step={0.1} className="w-24" />
                </FormControl>
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="hasHelpDebt" render={({ field }: any) => (
            <FormItem className="flex items-center space-x-3">
              <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              <div className="flex-1">
                <FormLabel>Has HELP/HECS Debt</FormLabel>
                <FormDescription>Check if employee has outstanding HELP/HECS debt</FormDescription>
              </div>
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
