'use client'

import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { useOnboarding } from '@/lib/context/staff-onboarding-context'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { step3Schema } from '@/lib/validations/onboarding'

type Step3Data = z.infer<typeof step3Schema>

export function StaffOnboardingStep3() {
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
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Tax Information</h2>
        <p className="text-muted-foreground">Your tax and superannuation details for payroll.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="tfn"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Tax File Number (TFN)</FormLabel>
                  <FormControl><Input placeholder="123 456 789" {...field} /></FormControl>
                  <FormDescription>Optional - leave blank if you don't have one</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="abn"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Australian Business Number (ABN)</FormLabel>
                  <FormControl><Input placeholder="12 345 678 901" {...field} /></FormControl>
                  <FormDescription>Only if you're a contractor</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="superannuationFund"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Superannuation Fund</FormLabel>
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
                  <FormLabel>Member Number</FormLabel>
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
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    I have a HELP/HECS debt
                  </FormLabel>
                  <FormDescription>
                    Check this if you have a Higher Education Contribution Scheme debt
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <div className="flex justify-between gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={prevStep} size="lg">
              &larr; Previous
            </Button>
            <Button type="submit" size="lg">
              Next: Banking Details &rarr;
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}