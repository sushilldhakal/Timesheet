'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { User, Briefcase, Clock } from 'lucide-react'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { ProfileSectionCard, ProfileInfoGrid, ProfileInfoField } from '@/components/shared/profile'
import { employeeClockKeys } from '@/lib/queries/employee-clock'

interface StaffOverviewTabProps {
  employee: {
    name?: string
    email?: string
    phone?: string
    dob?: string
    homeAddress?: string
    address?: {
      line1?: string
      line2?: string
      city?: string
      state?: string
      postcode?: string
      country?: string
    } | null
    emergencyContact?: {
      name?: string
      phone?: string
    } | null
    pin?: string
    employmentType?: string
    standardHoursPerWeek?: number | null
    employer?: string
  }
}

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  addressLine1: z.string().min(1, 'Address line 1 is required'),
  addressLine2: z.string().optional().or(z.literal('')),
  city: z.string().min(1, 'Suburb/City is required'),
  state: z.string().min(1, 'State is required'),
  postcode: z.string().min(3, 'Postcode is required'),
  country: z.string().min(1, 'Country is required'),
  emergencyContactName: z.string().min(1, 'Emergency contact name is required'),
  emergencyContactPhone: z.string().min(1, 'Emergency contact phone is required'),
})

type ProfileFormData = z.infer<typeof profileSchema>

export function StaffOverviewTab({ employee }: StaffOverviewTabProps) {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const address = employee.address || null
  const emergency = employee.emergencyContact || null

  const defaults = useMemo<ProfileFormData>(() => ({
    name: employee.name || '',
    email: employee.email || '',
    phone: employee.phone || '',
    addressLine1: address?.line1 || '',
    addressLine2: address?.line2 || '',
    city: address?.city || '',
    state: address?.state || '',
    postcode: address?.postcode || '',
    country: address?.country || 'Australia',
    emergencyContactName: emergency?.name || '',
    emergencyContactPhone: emergency?.phone || '',
  }), [address, emergency, employee.email, employee.name, employee.phone])

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaults,
    values: defaults,
  })

  const submit = async (data: ProfileFormData) => {
    const response = await fetch('/api/employee/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: {
          line1: data.addressLine1,
          line2: data.addressLine2,
          city: data.city,
          state: data.state,
          postcode: data.postcode,
          country: data.country,
        },
        emergencyContact: {
          name: data.emergencyContactName,
          phone: data.emergencyContactPhone,
        },
      }),
    })

    if (!response.ok) {
      const json = await response.json().catch(() => null)
      throw new Error(json?.error || 'Failed to update profile')
    }

    await queryClient.invalidateQueries({ queryKey: employeeClockKeys.profile })
    toast.success('Profile updated')
    setIsEditing(false)
  }

  return (
    <div className="space-y-6">
      <ProfileSectionCard
        title="Personal Information"
        description={isEditing ? 'Update your contact and address details' : 'Your personal details'}
        icon={<User className="h-5 w-5" />}
        actions={
          <Button variant="outline" size="sm" onClick={() => setIsEditing((v) => !v)}>
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
        }
      >
        {!isEditing ? (
          <ProfileInfoGrid columns={2}>
            <ProfileInfoField label="Full Name" value={employee.name} />
            <ProfileInfoField label="Email" value={employee.email} />
            <ProfileInfoField label="Phone" value={employee.phone} />
            <ProfileInfoField label="Date of Birth" value={employee.dob ? format(new Date(employee.dob), 'dd MMM yyyy') : null} />
            <ProfileInfoField label="Address" value={employee.homeAddress} span={2} />
            <ProfileInfoField label="PIN" value={employee.pin ? <span className="font-mono">{employee.pin}</span> : null} />
            <ProfileInfoField
              label="Emergency Contact"
              value={employee.emergencyContact?.name ? `${employee.emergencyContact.name} (${employee.emergencyContact.phone || ''})` : null}
              span={2}
            />
          </ProfileInfoGrid>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }: any) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }: any) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl><Input type="email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }: any) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div />
                <FormField
                  control={form.control}
                  name="addressLine1"
                  render={({ field }: any) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Address Line 1 *</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="addressLine2"
                  render={({ field }: any) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Address Line 2</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }: any) => (
                    <FormItem>
                      <FormLabel>Suburb/City *</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
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
                      <FormControl><Input {...field} /></FormControl>
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
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }: any) => (
                    <FormItem>
                      <FormLabel>Country *</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContactName"
                  render={({ field }: any) => (
                    <FormItem>
                      <FormLabel>Emergency Contact Name *</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContactPhone"
                  render={({ field }: any) => (
                    <FormItem>
                      <FormLabel>Emergency Contact Phone *</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </Form>
        )}
      </ProfileSectionCard>

      <ProfileSectionCard
        title="Employment Details"
        description="Your employment information"
        icon={<Briefcase className="h-5 w-5" />}
      >
        <ProfileInfoGrid columns={2}>
          <ProfileInfoField
            label="Employer"
            value={employee.employer}
          />
          <ProfileInfoField
            label="Employment Type"
            value={employee.employmentType ? (
              <Badge className="capitalize">{employee.employmentType}</Badge>
            ) : null}
          />
          <ProfileInfoField
            label="Standard Hours per Week"
            value={employee.standardHoursPerWeek ? `${employee.standardHoursPerWeek} hours` : null}
          />
        </ProfileInfoGrid>
      </ProfileSectionCard>
    </div>
  )
}
