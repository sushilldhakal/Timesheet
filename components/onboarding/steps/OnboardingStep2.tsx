'use client'

import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useOnboarding } from '@/lib/context/onboarding-context'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const step2Schema = z.object({
  legalFirstName: z.string().min(1, 'Legal first name is required'),
  legalMiddleNames: z.string().optional().or(z.literal('')),
  legalLastName: z.string().min(1, 'Legal last name is required'),
  preferredName: z.string().optional().or(z.literal('')),
  nationality: z.string().min(1, 'Nationality is required'),
  timeZone: z.string(),
  locale: z.string(),
})

type Step2Data = z.infer<typeof step2Schema>

export function OnboardingStep2() {
  const { formData, setFormData, nextStep, prevStep } = useOnboarding()

  const form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      legalFirstName: formData.legalFirstName,
      legalMiddleNames: formData.legalMiddleNames,
      legalLastName: formData.legalLastName,
      preferredName: formData.preferredName,
      nationality: formData.nationality,
      timeZone: formData.timeZone,
      locale: formData.locale,
    },
  })

  const onSubmit = (data: Step2Data) => {
    setFormData(data)
    nextStep()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Legal Details</h2>
        <p className="text-muted-foreground">Provide legal information and location preferences.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField control={form.control} name="legalFirstName" render={({ field }: any) => (
            <FormItem>
              <FormLabel>Legal First Name *</FormLabel>
              <FormControl><Input placeholder="As it appears on legal documents" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="legalMiddleNames" render={({ field }: any) => (
            <FormItem>
              <FormLabel>Middle Names (Optional)</FormLabel>
              <FormControl><Input placeholder="Middle names if any" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="legalLastName" render={({ field }: any) => (
            <FormItem>
              <FormLabel>Legal Last Name *</FormLabel>
              <FormControl><Input placeholder="As it appears on legal documents" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="preferredName" render={({ field }: any) => (
            <FormItem>
              <FormLabel>Preferred Name (Optional)</FormLabel>
              <FormControl><Input placeholder="Name to use at work (if different)" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="nationality" render={({ field }: any) => (
            <FormItem>
              <FormLabel>Nationality *</FormLabel>
              <FormControl><Input placeholder="Australian, British, etc." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="timeZone" render={({ field }: any) => (
            <FormItem>
              <FormLabel>Time Zone</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="Australia/Sydney">Australia/Sydney (AEDT/AEST)</SelectItem>
                  <SelectItem value="Australia/Melbourne">Australia/Melbourne (AEDT/AEST)</SelectItem>
                  <SelectItem value="Australia/Brisbane">Australia/Brisbane (AEST)</SelectItem>
                  <SelectItem value="Australia/Perth">Australia/Perth (AWST)</SelectItem>
                  <SelectItem value="Australia/Adelaide">Australia/Adelaide (ACDT/ACST)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="locale" render={({ field }: any) => (
            <FormItem>
              <FormLabel>Locale/Language</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="en-AU">English (Australia)</SelectItem>
                  <SelectItem value="en-GB">English (United Kingdom)</SelectItem>
                  <SelectItem value="en-US">English (United States)</SelectItem>
                </SelectContent>
              </Select>
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
