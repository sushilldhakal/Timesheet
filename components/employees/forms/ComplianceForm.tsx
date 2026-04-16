'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, AlertCircle, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { updateEmployeeCompliance } from '@/lib/api/employees'
import { complianceUpdateSchema } from '@/lib/validations/employee-payroll'
import type { z } from 'zod'

type ComplianceFormData = z.infer<typeof complianceUpdateSchema>

interface ComplianceFormProps {
  employeeId: string
  initialData?: {
    wwcStatus?: string | null
    wwcNumber?: string | null
    wwcExpiryDate?: string | null
    policeClearanceStatus?: string | null
    policeClearanceNumber?: string | null
    policeClearanceExpiryDate?: string | null
    foodHandlingStatus?: string | null
    foodHandlingExpiryDate?: string | null
    inductionCompleted?: boolean
    inductionDate?: string | null
    codeOfConductSigned?: boolean
    codeOfConductDate?: string | null
    healthSafetyCertifications?: string[]
  }
  onSuccess?: () => void
  onCancel?: () => void
}

function toDateInput(val?: string | null): string {
  if (!val) return ''
  try { return new Date(val).toISOString().split('T')[0] } catch { return '' }
}

export function ComplianceForm({
  employeeId,
  initialData,
  onSuccess,
  onCancel,
}: ComplianceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [certifications, setCertifications] = useState<string[]>(
    initialData?.healthSafetyCertifications ?? []
  )
  const [newCert, setNewCert] = useState('')

  const form = useForm<ComplianceFormData>({
    resolver: zodResolver(complianceUpdateSchema),
    defaultValues: {
      wwcStatus: (initialData?.wwcStatus as ComplianceFormData['wwcStatus']) ?? undefined,
      wwcNumber: initialData?.wwcNumber ?? '',
      wwcExpiryDate: toDateInput(initialData?.wwcExpiryDate),
      policeClearanceStatus: (initialData?.policeClearanceStatus as ComplianceFormData['policeClearanceStatus']) ?? undefined,
      policeClearanceNumber: initialData?.policeClearanceNumber ?? '',
      policeClearanceExpiryDate: toDateInput(initialData?.policeClearanceExpiryDate),
      foodHandlingStatus: (initialData?.foodHandlingStatus as ComplianceFormData['foodHandlingStatus']) ?? undefined,
      foodHandlingExpiryDate: toDateInput(initialData?.foodHandlingExpiryDate),
      inductionCompleted: initialData?.inductionCompleted ?? false,
      inductionDate: toDateInput(initialData?.inductionDate),
      codeOfConductSigned: initialData?.codeOfConductSigned ?? false,
      codeOfConductDate: toDateInput(initialData?.codeOfConductDate),
    },
  })

  const onSubmit = async (data: ComplianceFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      await updateEmployeeCompliance(employeeId, {
        ...data,
        healthSafetyCertifications: certifications.length > 0 ? certifications : undefined,
      })
      toast.success('Compliance information updated successfully')
      onSuccess?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update compliance'
      setSubmitError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const addCertification = () => {
    const trimmed = newCert.trim()
    if (trimmed && !certifications.includes(trimmed)) {
      setCertifications([...certifications, trimmed])
      setNewCert('')
    }
  }

  const removeCertification = (index: number) => {
    setCertifications(certifications.filter((_, i) => i !== index))
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Compliance Information</CardTitle>
        <CardDescription>Update compliance status and certifications</CardDescription>
      </CardHeader>
      <CardContent>
        {submitError && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {submitError}
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSubmitError(null)}>
              Dismiss
            </Button>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* WWC */}
            <div className="space-y-4 border-b pb-6">
              <h3 className="font-semibold">Working With Children Check (WWC)</h3>
              <FormField
                control={form.control}
                name="wwcStatus"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>WWC Status</FormLabel>
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
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
                name="wwcNumber"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>WWC Number</FormLabel>
                    <FormControl><Input placeholder="e.g., WWC1234567" {...field} /></FormControl>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Police Clearance */}
            <div className="space-y-4 border-b pb-6">
              <h3 className="font-semibold">Police Clearance</h3>
              <FormField
                control={form.control}
                name="policeClearanceStatus"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Police Clearance Status</FormLabel>
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
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
                name="policeClearanceNumber"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Police Clearance Number</FormLabel>
                    <FormControl><Input placeholder="e.g., PC-2024-12345" {...field} /></FormControl>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Food Handling */}
            <div className="space-y-4 border-b pb-6">
              <h3 className="font-semibold">Food Handling Certification</h3>
              <FormField
                control={form.control}
                name="foodHandlingStatus"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Food Handling Status</FormLabel>
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Induction & Code of Conduct */}
            <div className="space-y-4 border-b pb-6">
              <h3 className="font-semibold">Induction & Agreements</h3>
              <FormField
                control={form.control}
                name="inductionCompleted"
                render={({ field }: any) => (
                  <FormItem className="flex items-center space-x-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="flex-1">
                      <FormLabel className="text-base">Induction Completed</FormLabel>
                      <FormDescription>Check when employee has completed induction</FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              {form.watch('inductionCompleted') && (
                <FormField
                  control={form.control}
                  name="inductionDate"
                  render={({ field }: any) => (
                    <FormItem>
                      <FormLabel>Induction Completed Date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="codeOfConductSigned"
                render={({ field }: any) => (
                  <FormItem className="flex items-center space-x-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="flex-1">
                      <FormLabel className="text-base">Code of Conduct Signed</FormLabel>
                      <FormDescription>Check when employee has signed code of conduct</FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              {form.watch('codeOfConductSigned') && (
                <FormField
                  control={form.control}
                  name="codeOfConductDate"
                  render={({ field }: any) => (
                    <FormItem>
                      <FormLabel>Code of Conduct Signed Date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Health & Safety Certifications */}
            <div className="space-y-4">
              <h3 className="font-semibold">Health & Safety Certifications</h3>
              {certifications.map((cert, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input value={cert} readOnly className="flex-1" />
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeCertification(index)} className="text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., First Aid Certificate, HAZMAT Training"
                  value={newCert}
                  onChange={(e) => setNewCert(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCertification() } }}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={addCertification}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t pt-6">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Saving...' : 'Save Compliance Information'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
