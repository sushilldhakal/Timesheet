'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { DateRangePicker } from '@/components/ui/date-range-picker'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { createEmployeeContract, updateEmployeeContract } from '@/lib/api/employees'
import { contractBodySchema } from '@/lib/validations/employee-payroll'
import type { z } from 'zod'

type ContractFormData = z.infer<typeof contractBodySchema>

interface ContractFormProps {
  employeeId: string
  isEditing?: boolean
  initialData?: {
    contractType?: string
    startDate?: string
    endDate?: string | null
    wageType?: string
    salary?: number | null
    noticePeriod?: number | null
    probationPeriodEnd?: string | null
  }
  onSuccess?: () => void
  onCancel?: () => void
}

export function ContractForm({
  employeeId,
  isEditing = false,
  initialData,
  onSuccess,
  onCancel,
}: ContractFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const fromYmd = (value?: string | null): Date | undefined => {
    if (!value) return undefined
    // Parse as local date to avoid timezone offsets.
    const d = new Date(`${value}T00:00:00`)
    return Number.isNaN(d.getTime()) ? undefined : d
  }

  const toYmd = (value?: Date): string => {
    if (!value) return ''
    return format(value, 'yyyy-MM-dd')
  }

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractBodySchema),
    defaultValues: {
      contractType: (initialData?.contractType as ContractFormData['contractType']) || 'permanent',
      startDate: initialData?.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : '',
      endDate: initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : '',
      wageType: (initialData?.wageType as ContractFormData['wageType']) || 'salary',
      salary: initialData?.salary ?? 0,
      noticePeriod: initialData?.noticePeriod ?? 2,
      probationPeriodEnd: initialData?.probationPeriodEnd ? new Date(initialData.probationPeriodEnd).toISOString().split('T')[0] : '',
    },
  })

  const wageType = form.watch('wageType')

  const onSubmit = async (data: ContractFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      if (isEditing) {
        await updateEmployeeContract(employeeId, data)
        toast.success('Contract updated successfully')
      } else {
        await createEmployeeContract(employeeId, data)
        toast.success('Contract created successfully')
      }
      onSuccess?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save contract'
      setSubmitError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Contract' : 'New Contract'}</CardTitle>
        <CardDescription>
          {isEditing ? 'Update employee contract details' : 'Create a new employment contract'}
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
              name="contractType"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Contract Type *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="permanent">Permanent</SelectItem>
                      <SelectItem value="fixed-term">Fixed-Term</SelectItem>
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
              name="startDate"
              render={({ field }: any) => {
                const endDate = form.watch('endDate')
                const endDateError = (form.formState.errors as any)?.endDate?.message as string | undefined

                return (
                  <FormItem>
                    <FormLabel>Start / End Dates *</FormLabel>
                    <FormControl>
                      <DateRangePicker
                        dateRange={{
                          from: fromYmd(field.value),
                          to: fromYmd(endDate),
                        }}
                        onDateRangeChange={(range) => {
                          field.onChange(toYmd(range?.from))
                          form.setValue('endDate', toYmd(range?.to), { shouldValidate: true, shouldDirty: true })
                        }}
                        placeholder="Pick contract dates"
                      />
                    </FormControl>
                    <FormDescription>Leave end date blank for permanent contracts</FormDescription>
                    <FormMessage />
                    {endDateError ? <p className="text-sm font-medium text-destructive">{endDateError}</p> : null}
                  </FormItem>
                )
              }}
            />

            <FormField
              control={form.control}
              name="wageType"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Wage Type *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="salary">Salary (Annual)</SelectItem>
                      <SelectItem value="hourly">Hourly Rate</SelectItem>
                      <SelectItem value="piecework">Piecework</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="salary"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>
                    {wageType === 'salary' && 'Annual Salary (AUD) *'}
                    {wageType === 'hourly' && 'Hourly Rate (AUD/hr) *'}
                    {wageType === 'piecework' && 'Piecework Rate (AUD) *'}
                  </FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">AUD</span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        step={0.01}
                        min={0}
                        className="font-mono"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="noticePeriod"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Notice Period (days)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="2"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      min={0}
                      max={365}
                    />
                  </FormControl>
                  <FormDescription>Days of notice required to terminate</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="probationPeriodEnd"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Probation Period End (optional)</FormLabel>
                  <FormControl>
                    <DatePicker
                      date={fromYmd(field.value)}
                      onDateChange={(d) => field.onChange(toYmd(d))}
                      placeholder="Pick a date"
                    />
                  </FormControl>
                  <FormDescription>Date when probation period ends (if applicable)</FormDescription>
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
                {isSubmitting ? 'Saving...' : (isEditing ? 'Update Contract' : 'Create Contract')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
