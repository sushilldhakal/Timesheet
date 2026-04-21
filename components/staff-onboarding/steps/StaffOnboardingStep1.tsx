'use client'

import { useForm } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { useOnboarding } from '@/lib/context/staff-onboarding-context'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { staffOnboardingStep1Schema } from '@/lib/validations/staff-onboarding'
import { OnboardingStepShell } from '@/components/shared/onboarding'

type Step1Data = z.infer<typeof staffOnboardingStep1Schema>

export function StaffOnboardingStep1() {
  const { formData, setFormData, nextStep } = useOnboarding()

  const form = useForm<Step1Data>({
    resolver: zodResolver(staffOnboardingStep1Schema),
    defaultValues: {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      addressLine1: formData.addressLine1,
      addressLine2: formData.addressLine2,
      city: formData.city,
      state: formData.state,
      postcode: formData.postcode,
      country: formData.country,
      legalFirstName: formData.legalFirstName,
      legalMiddleNames: formData.legalMiddleNames,
      legalLastName: formData.legalLastName,
      preferredName: formData.preferredName,
      nationality: formData.nationality,
      timeZone: formData.timeZone,
      emergencyContactName: formData.emergencyContactName,
      emergencyContactPhone: formData.emergencyContactPhone,
      australianIdType: formData.australianIdType || undefined,
      australianIdNumber: formData.australianIdNumber,
      visaType: formData.visaType,
      visaNumber: formData.visaNumber,
      maxHoursPerFortnight: formData.maxHoursPerFortnight || 0,
    },
  })

  const nationality = form.watch('nationality')
  const isAustralian = String(nationality || '').toLowerCase().includes('austral')

  const onSubmit = (data: Step1Data) => {
    setFormData(data)
    nextStep()
  }

  return (
    <OnboardingStepShell
      title="Personal & Legal Details"
      description="Verify your contact details and provide your legal information."
      onNext={form.handleSubmit(onSubmit)}
      isFirstStep
      nextLabel="Next: Tax Information"
      centered
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b pb-2">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl><Input placeholder="John" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl><Input placeholder="Smith" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Email Address *</FormLabel>
                  <FormControl><Input placeholder="john.smith@example.com" type="email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Phone Number *</FormLabel>
                  <FormControl><Input placeholder="+61 2 1234 5678" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="addressLine1"
              render={({ field }: any) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Address Line 1 *</FormLabel>
                  <FormControl><Input placeholder="Street address" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="addressLine2"
              render={({ field }: any) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Address Line 2 (Optional)</FormLabel>
                  <FormControl><Input placeholder="Apartment, unit, etc." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:col-span-2">
              <FormField
                control={form.control}
                name="city"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Suburb/City *</FormLabel>
                    <FormControl><Input placeholder="Suburb" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>State *</FormLabel>
                    <FormControl><Input placeholder="VIC" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postcode"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Postcode *</FormLabel>
                    <FormControl><Input placeholder="3000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="country"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Country *</FormLabel>
                  <FormControl><Input placeholder="Australia" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Legal Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b pb-2">
              Legal Details
            </h3>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>

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
                        <SelectTrigger><SelectValue /></SelectTrigger>
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
            </div>

            {isAustralian ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="australianIdType"
                  render={({ field }: any) => (
                    <FormItem>
                      <FormLabel>Australian ID Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an ID type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="drivers_licence">Driver Licence</SelectItem>
                          <SelectItem value="medicare">Medicare Card</SelectItem>
                          <SelectItem value="passport">Passport</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="australianIdNumber"
                  render={({ field }: any) => (
                    <FormItem>
                      <FormLabel>ID Number *</FormLabel>
                      <FormControl><Input placeholder="Enter your ID number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="visaType"
                    render={({ field }: any) => (
                      <FormItem>
                        <FormLabel>Visa Type *</FormLabel>
                        <FormControl><Input placeholder="e.g. Student Visa" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="visaNumber"
                    render={({ field }: any) => (
                      <FormItem>
                        <FormLabel>Visa Number *</FormLabel>
                        <FormControl><Input placeholder="Visa number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="maxHoursPerFortnight"
                  render={({ field }: any) => (
                    <FormItem>
                      <FormLabel>Maximum Hours Per Fortnight (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="e.g. 40 for student visa" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        For student visas or other work restrictions. Leave blank if no limit applies.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b pb-2">
              Emergency Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="emergencyContactName"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Contact Name *</FormLabel>
                    <FormControl><Input placeholder="Full name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergencyContactPhone"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Contact Number *</FormLabel>
                    <FormControl><Input placeholder="Phone number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </form>
      </Form>
    </OnboardingStepShell>
  )
}
