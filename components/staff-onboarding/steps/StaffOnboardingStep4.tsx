'use client'

import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { useOnboarding } from '@/lib/context/staff-onboarding-context'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { step4Schema } from '@/lib/validations/onboarding'

type Step4Data = z.infer<typeof step4Schema>

export function StaffOnboardingStep4() {
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
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Banking Details</h2>
        <p className="text-muted-foreground">Your bank account information for salary payments.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="bankName"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Bank Name *</FormLabel>
                <FormControl><Input placeholder="e.g., Commonwealth Bank" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="bsbCode"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>BSB Code *</FormLabel>
                  <FormControl><Input placeholder="123-456" {...field} /></FormControl>
                  <FormDescription>6-digit BSB in format XXX-XXX</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accountNumber"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Account Number *</FormLabel>
                  <FormControl><Input placeholder="12345678" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="accountHolderName"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Account Holder Name *</FormLabel>
                <FormControl><Input placeholder="Name as it appears on your bank account" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accountType"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Account Type *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="savings">Savings Account</SelectItem>
                    <SelectItem value="cheque">Cheque Account</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={prevStep} size="lg">
              &larr; Previous
            </Button>
            <Button type="submit" size="lg">
              Next: Employment Contract &rarr;
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}