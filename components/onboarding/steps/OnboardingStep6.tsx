'use client'

import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useOnboarding } from '@/lib/context/onboarding-context'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const step6Schema = z.object({
  wwcStatus: z.enum(['not_required', 'pending', 'active', 'expired']),
  wwcExpiryDate: z.string().optional().or(z.literal('')),
  policeClearanceStatus: z.enum(['pending', 'active', 'expired']),
  policeClearanceExpiryDate: z.string().optional().or(z.literal('')),
  foodHandlingStatus: z.enum(['current', 'expired']),
  foodHandlingExpiryDate: z.string().optional().or(z.literal('')),
})

type Step6Data = z.infer<typeof step6Schema>

export function OnboardingStep6() {
  const { formData, setFormData, nextStep, prevStep } = useOnboarding()

  const form = useForm<Step6Data>({
    resolver: zodResolver(step6Schema),
    defaultValues: {
      wwcStatus: (formData.wwcStatus as Step6Data['wwcStatus']) || 'pending',
      wwcExpiryDate: formData.wwcExpiryDate,
      policeClearanceStatus: (formData.policeClearanceStatus as Step6Data['policeClearanceStatus']) || 'pending',
      policeClearanceExpiryDate: formData.policeClearanceExpiryDate,
      foodHandlingStatus: (formData.foodHandlingStatus as Step6Data['foodHandlingStatus']) || 'current',
      foodHandlingExpiryDate: formData.foodHandlingExpiryDate,
    },
  })

  const onSubmit = (data: Step6Data) => {
    setFormData(data)
    nextStep()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Compliance Requirements</h2>
        <p className="text-muted-foreground">Enter compliance and clearance status.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-3 p-4 bg-muted/50 rounded-md">
            <h3 className="font-semibold">Working With Children Check (WWC)</h3>
            <FormField control={form.control} name="wwcStatus" render={({ field }) => (
              <FormItem>
                <FormLabel>Status *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="not_required">Not Required</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="wwcExpiryDate" render={({ field }) => (
              <FormItem>
                <FormLabel>Expiry Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="space-y-3 p-4 bg-muted/50 rounded-md">
            <h3 className="font-semibold">Police Clearance</h3>
            <FormField control={form.control} name="policeClearanceStatus" render={({ field }) => (
              <FormItem>
                <FormLabel>Status *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="policeClearanceExpiryDate" render={({ field }) => (
              <FormItem>
                <FormLabel>Expiry Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="space-y-3 p-4 bg-muted/50 rounded-md">
            <h3 className="font-semibold">Food Handling Certification</h3>
            <FormField control={form.control} name="foodHandlingStatus" render={({ field }) => (
              <FormItem>
                <FormLabel>Status *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="current">Current</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="foodHandlingExpiryDate" render={({ field }) => (
              <FormItem>
                <FormLabel>Expiry Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="flex justify-between gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={prevStep}>&larr; Previous</Button>
            <Button type="submit">Next Step &rarr;</Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
