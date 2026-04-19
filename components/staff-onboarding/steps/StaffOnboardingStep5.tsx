'use client'

import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { useOnboarding } from '@/lib/context/staff-onboarding-context'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { step5Schema } from '@/lib/validations/onboarding'

type Step5Data = z.infer<typeof step5Schema>

export function StaffOnboardingStep5() {
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

  const onSubmit = (data: Step5Data) => {
    setFormData(data)
    nextStep()
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Employment Contract</h2>
        <p className="text-muted-foreground">Details about your employment arrangement.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="contractType"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Contract Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select contract type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="permanent">Permanent</SelectItem>
                      <SelectItem value="fixed-term">Fixed Term</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="contractor">Contractor</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="wageType"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Wage Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select wage type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="salary">Salary</SelectItem>
                      <SelectItem value="hourly">Hourly Rate</SelectItem>
                      <SelectItem value="piecework">Piecework</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Start Date *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>End Date (if applicable)</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormDescription>Only for fixed-term contracts</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="salary"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Salary/Rate (AUD) *</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="50000" 
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormDescription>Annual salary or hourly rate</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="noticePeriod"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Notice Period (weeks)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="2" 
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 2)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="probationPeriodEnd"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Probation End Date (if applicable)</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
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
              Next: Compliance &rarr;
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}