'use client'

import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { useOnboarding } from '@/lib/context/staff-onboarding-context'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { step2Schema } from '@/lib/validations/onboarding'

type Step2Data = z.infer<typeof step2Schema>

export function StaffOnboardingStep2() {
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
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Legal Details</h2>
        <p className="text-muted-foreground">Your legal name as it appears on official documents.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="legalFirstName"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Legal First Name *</FormLabel>
                  <FormControl><Input placeholder="John" {...field} /></FormControl>
                  <FormDescription>As shown on your passport or birth certificate</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="legalLastName"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Legal Last Name *</FormLabel>
                  <FormControl><Input placeholder="Smith" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="legalMiddleNames"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Middle Names (Optional)</FormLabel>
                <FormControl><Input placeholder="Middle names if any" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="preferredName"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Preferred Name (Optional)</FormLabel>
                <FormControl><Input placeholder="What you'd like to be called at work" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nationality"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Nationality *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your nationality" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Australian">Australian</SelectItem>
                    <SelectItem value="New Zealand">New Zealand</SelectItem>
                    <SelectItem value="British">British</SelectItem>
                    <SelectItem value="American">American</SelectItem>
                    <SelectItem value="Canadian">Canadian</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="timeZone"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Time Zone</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Australia/Sydney">Sydney (AEDT/AEST)</SelectItem>
                      <SelectItem value="Australia/Melbourne">Melbourne (AEDT/AEST)</SelectItem>
                      <SelectItem value="Australia/Brisbane">Brisbane (AEST)</SelectItem>
                      <SelectItem value="Australia/Perth">Perth (AWST)</SelectItem>
                      <SelectItem value="Australia/Adelaide">Adelaide (ACDT/ACST)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="locale"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Language/Locale</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="en-AU">English (Australia)</SelectItem>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="en-GB">English (UK)</SelectItem>
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
              Next: Tax Information &rarr;
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}