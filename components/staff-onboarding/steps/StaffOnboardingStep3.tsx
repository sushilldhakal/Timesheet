'use client'

import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { useOnboarding } from '@/lib/context/staff-onboarding-context'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { staffOnboardingStep3Schema } from '@/lib/validations/staff-onboarding'

type Step3Data = z.infer<typeof staffOnboardingStep3Schema>

export function StaffOnboardingStep3() {
  const { formData, setFormData, nextStep, prevStep } = useOnboarding()

  const form = useForm<Step3Data>({
    resolver: zodResolver(staffOnboardingStep3Schema),
    defaultValues: {
      wwcStatus: formData.wwcStatus,
      wwcExpiryDate: formData.wwcExpiryDate,
      policeClearanceStatus: formData.policeClearanceStatus,
      policeClearanceExpiryDate: formData.policeClearanceExpiryDate,
      foodHandlingStatus: formData.foodHandlingStatus,
      foodHandlingExpiryDate: formData.foodHandlingExpiryDate,
    },
  })

  const onSubmit = (data: Step3Data) => {
    setFormData(data)
    nextStep()
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Compliance & Certifications</h2>
        <p className="text-muted-foreground">Required clearances and certifications for your role.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Working with Children Check</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="wwcStatus"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>WWC Status *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="not_required">Not Required</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="wwcExpiryDate"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>WWC Expiry Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormDescription>If you have an active WWC</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Police Clearance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="policeClearanceStatus"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Police Clearance Status *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="policeClearanceExpiryDate"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Police Clearance Expiry Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormDescription>If you have an active clearance</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Food Handling Certificate</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="foodHandlingStatus"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Food Handling Status *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="current">Current</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="foodHandlingExpiryDate"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Food Handling Expiry Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormDescription>If you have a current certificate</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex justify-between gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={prevStep} size="lg">
              &larr; Previous
            </Button>
            <Button type="submit" size="lg">
              Next: Review & Submit &rarr;
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
