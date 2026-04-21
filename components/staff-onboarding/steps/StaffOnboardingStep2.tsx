'use client'

import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { useOnboarding } from '@/lib/context/staff-onboarding-context'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { staffOnboardingStep2Schema } from '@/lib/validations/staff-onboarding'

type Step2Data = z.infer<typeof staffOnboardingStep2Schema>

export function StaffOnboardingStep2() {
  const { formData, setFormData, nextStep, prevStep } = useOnboarding()

  const form = useForm<Step2Data>({
    resolver: zodResolver(staffOnboardingStep2Schema),
    defaultValues: {
      tfn: formData.tfn,
      superannuationFund: formData.superannuationFund,
      superannuationMemberNumber: formData.superannuationMemberNumber,
      taxFreeThreshold: formData.taxFreeThreshold,
      hasHelpDebt: formData.hasHelpDebt,
      bankName: formData.bankName,
      accountNumber: formData.accountNumber,
      bsbCode: formData.bsbCode,
      accountHolderName: formData.accountHolderName,
      accountType: formData.accountType,
    },
  })

  const onSubmit = (data: Step2Data) => {
    setFormData(data)
    nextStep()
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Tax & Banking</h2>
        <p className="text-muted-foreground">Your tax, superannuation, and bank account details for payroll.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

          {/* Tax Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b pb-2">
              Tax Information
            </h3>

            <FormField
              control={form.control}
              name="tfn"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Tax File Number (TFN) *</FormLabel>
                  <FormControl><Input placeholder="123456789" inputMode="numeric" {...field} /></FormControl>
                  <FormDescription>Enter 8 or 9 digits (numbers only)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="taxFreeThreshold"
              render={({ field }: any) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Claim the tax-free threshold</FormLabel>
                    <FormDescription>
                      Most employees should claim this (only claim from one employer at a time).
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="superannuationFund"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Superannuation Fund *</FormLabel>
                    <FormControl><Input placeholder="e.g., Australian Super" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="superannuationMemberNumber"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Member Number *</FormLabel>
                    <FormControl><Input placeholder="Your super member number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="hasHelpDebt"
              render={({ field }: any) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>I have a HELP/HECS debt</FormLabel>
                    <FormDescription>
                      Check this if you have a Higher Education Contribution Scheme debt
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>

          {/* Banking Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b pb-2">
              Banking Details
            </h3>

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
                    <FormControl><Input placeholder="123456" inputMode="numeric" {...field} /></FormControl>
                    <FormDescription>6 digits (you can type 123-456 or 123456)</FormDescription>
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
                    <FormControl><Input placeholder="12345678" inputMode="numeric" {...field} /></FormControl>
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
          </div>

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
