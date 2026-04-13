'use client'

import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useOnboarding } from '@/lib/context/onboarding-context'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const bsbRegex = /^\d{3}-\d{3}$/

const step4Schema = z.object({
  bankName: z.string().min(1, 'Bank name is required'),
  accountNumber: z.string().min(6, 'Account number must be at least 6 digits'),
  bsbCode: z.string().regex(bsbRegex, 'BSB must be in format XXX-XXX'),
  accountHolderName: z.string().min(1, 'Account holder name is required'),
  accountType: z.enum(['savings', 'cheque']),
})

type Step4Data = z.infer<typeof step4Schema>

export function OnboardingStep4() {
  const { formData, setFormData, nextStep, prevStep } = useOnboarding()

  const form = useForm<Step4Data>({
    resolver: zodResolver(step4Schema),
    defaultValues: {
      bankName: formData.bankName,
      accountNumber: formData.accountNumber,
      bsbCode: formData.bsbCode,
      accountHolderName: formData.accountHolderName,
      accountType: formData.accountType,
    },
  })

  const onSubmit = (data: Step4Data) => {
    setFormData(data)
    nextStep()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Banking Details</h2>
        <p className="text-muted-foreground">Provide bank account information for salary deposits.</p>
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-md text-sm text-blue-800 dark:text-blue-300">
          All banking information will be encrypted and stored securely.
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField control={form.control} name="bankName" render={({ field }) => (
            <FormItem>
              <FormLabel>Bank Name *</FormLabel>
              <FormControl><Input placeholder="e.g., Commonwealth Bank" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="accountNumber" render={({ field }) => (
            <FormItem>
              <FormLabel>Account Number *</FormLabel>
              <FormControl><Input type="password" placeholder="Account number (will be masked)" {...field} className="font-mono" /></FormControl>
              <FormDescription>Displayed as ****1234 for security</FormDescription>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="bsbCode" render={({ field }) => (
            <FormItem>
              <FormLabel>BSB Code *</FormLabel>
              <FormControl><Input placeholder="000-000" {...field} className="font-mono" /></FormControl>
              <FormDescription>Format: XXX-XXX</FormDescription>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="accountHolderName" render={({ field }) => (
            <FormItem>
              <FormLabel>Account Holder Name *</FormLabel>
              <FormControl><Input placeholder="Name on the bank account" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="accountType" render={({ field }) => (
            <FormItem>
              <FormLabel>Account Type *</FormLabel>
              <FormControl>
                <RadioGroup value={field.value} onValueChange={field.onChange}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="savings" id="savings" />
                    <label htmlFor="savings" className="cursor-pointer">Savings</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cheque" id="cheque" />
                    <label htmlFor="cheque" className="cursor-pointer">Cheque</label>
                  </div>
                </RadioGroup>
              </FormControl>
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
