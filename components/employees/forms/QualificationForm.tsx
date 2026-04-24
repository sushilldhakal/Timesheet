'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { createEmployeeQualification, updateEmployeeQualification } from '@/lib/api/employees'
import { qualificationBodySchema } from '@/lib/validations/employee-payroll'
import type { z } from 'zod'

type QualificationFormData = z.infer<typeof qualificationBodySchema>

interface QualificationFormProps {
  employeeId: string
  isEditing?: boolean
  initialData?: {
    qualificationName?: string
    issuingBody?: string
    issueDate?: string
    expiryDate?: string | null
    licenseNumber?: string | null
    documentUrl?: string | null
  }
  onSuccess?: () => void
  onCancel?: () => void
}

export function QualificationForm({
  employeeId,
  isEditing = false,
  initialData,
  onSuccess,
  onCancel,
}: QualificationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const fromYmd = (value?: string | null): Date | undefined => {
    if (!value) return undefined
    const d = new Date(`${value}T00:00:00`)
    return Number.isNaN(d.getTime()) ? undefined : d
  }

  const toYmd = (value?: Date): string => {
    if (!value) return ''
    return format(value, 'yyyy-MM-dd')
  }

  const form = useForm<QualificationFormData>({
    resolver: zodResolver(qualificationBodySchema),
    defaultValues: {
      qualificationName: initialData?.qualificationName || '',
      issuingBody: initialData?.issuingBody || '',
      issueDate: initialData?.issueDate ? new Date(initialData.issueDate).toISOString().split('T')[0] : '',
      expiryDate: initialData?.expiryDate ? new Date(initialData.expiryDate).toISOString().split('T')[0] : '',
      licenseNumber: initialData?.licenseNumber || '',
      documentUrl: initialData?.documentUrl || '',
    },
  })

  const onSubmit = async (data: QualificationFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      if (isEditing) {
        await updateEmployeeQualification(employeeId, data)
        toast.success('Qualification updated successfully')
      } else {
        await createEmployeeQualification(employeeId, data)
        toast.success('Qualification added successfully')
      }
      onSuccess?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save qualification'
      setSubmitError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Qualification' : 'Add Qualification'}</CardTitle>
        <CardDescription>
          {isEditing ? 'Update qualification details' : 'Add a new qualification or certification'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {submitError && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {submitError}
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => setSubmitError(null)}
            >
              Dismiss
            </Button>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="qualificationName"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Qualification Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Food Handler Certificate, RSA, First Aid"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="issuingBody"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Issuing Body *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., NSW Food Authority, Liquor & Gaming NSW"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Organization that issued the qualification</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="issueDate"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Issue Date *</FormLabel>
                  <FormControl>
                    <DatePicker
                      date={fromYmd(field.value)}
                      onDateChange={(d) => field.onChange(toYmd(d))}
                      placeholder="Pick a date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiryDate"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Expiry Date (optional)</FormLabel>
                  <FormControl>
                    <DatePicker
                      date={fromYmd(field.value)}
                      onDateChange={(d) => field.onChange(toYmd(d))}
                      placeholder="Pick a date"
                    />
                  </FormControl>
                  <FormDescription>Leave blank if qualification doesn&apos;t expire</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="licenseNumber"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>License/Certificate Number (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., FH-2022-12345"
                      {...field}
                      className="font-mono"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="documentUrl"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Document URL (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://... (link to certificate or proof)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>URL to stored document or certificate</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Saving...' : (isEditing ? 'Update Qualification' : 'Add Qualification')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
