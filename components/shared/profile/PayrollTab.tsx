"use client"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { AlertCircle, DollarSign, RefreshCw, Globe, Edit2 } from "lucide-react"
import { useEmployeeTaxInfo } from "@/lib/queries/employees"
import { ProfileSectionCard, ProfileInfoGrid, ProfileInfoField } from "@/components/shared/profile"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PasswordVerificationDialog } from "./PasswordVerificationDialog"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateEmployeeTaxInfo } from "@/lib/api/employees"
import { toast } from "sonner"

interface PayrollTabProps {
  employeeId: string
  isStaffView?: boolean
}

function SectionSkeleton() {
  return (
    <ProfileSectionCard title="Loading...">
      <ProfileInfoGrid columns={2}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </ProfileInfoGrid>
    </ProfileSectionCard>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground mb-3">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
        Retry
      </Button>
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  )
}

function TaxInfoSection({ employeeId, isStaffView }: { employeeId: string; isStaffView?: boolean }) {
  const { data, isLoading, error, refetch } = useEmployeeTaxInfo(employeeId)
  const [open, setOpen] = useState(false)
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false)
  const [isVerified, setIsVerified] = useState(false)

  const digitsOnly = (value: unknown) => String(value ?? '').replace(/\D/g, '')
  const staffPayrollUpdateSchema = z.object({
    taxFreeThreshold: z.boolean(),
    hasHelpDebt: z.boolean(),
    superannuationFund: z.string().min(1, 'Super fund name is required'),
    superannuationMemberNumber: z.string().min(1, 'Super member number is required'),
    bankName: z.string().min(1, 'Bank name is required'),
    accountHolderName: z.string().min(1, 'Account holder name is required'),
    bsb: z.string()
      .transform((v) => digitsOnly(v))
      .refine((v) => /^\d{6}$/.test(v), { message: 'BSB must be 6 digits' }),
    accountNumber: z.string()
      .transform((v) => digitsOnly(v))
      .refine((v) => /^\d{6,10}$/.test(v), { message: 'Account number must be 6-10 digits' }),
    accountType: z.enum(['savings', 'cheque']),
  })

  type StaffPayrollUpdateData = z.infer<typeof staffPayrollUpdateSchema>

  const staffForm = useForm<StaffPayrollUpdateData>({
    resolver: zodResolver(staffPayrollUpdateSchema),
    defaultValues: {
      taxFreeThreshold: true,
      hasHelpDebt: false,
      superannuationFund: '',
      superannuationMemberNumber: '',
      bankName: '',
      accountHolderName: '',
      bsb: '',
      accountNumber: '',
      accountType: 'savings',
    },
  })

  if (isLoading) return <SectionSkeleton />

  const isNotFound = error && (error as Error).message?.includes("not found")

  if (error && !isNotFound) {
    return (
      <ProfileSectionCard
        title="Tax Information"
        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
      >
        <ErrorState message="Failed to load tax information" onRetry={() => refetch()} />
      </ProfileSectionCard>
    )
  }

  const taxInfo = data?.taxInfo

  const actions = taxInfo && (
    <div className="flex items-center gap-1.5">
      <Badge variant="outline" className="text-xs gap-1">
        <Globe className="h-3 w-3" />
        {taxInfo.countryName}
      </Badge>
      <Badge variant="secondary" className="text-xs">Encrypted</Badge>
      {isStaffView && (
        <Button 
          variant="outline" 
          size="sm" 
          className="ml-1" 
          onClick={() => {
            // For staff view, require password verification first
            setVerifyDialogOpen(true)
          }}
        >
          <Edit2 className="h-3.5 w-3.5 mr-1.5" />
          Update
        </Button>
      )}
    </div>
  )

  return (
    <ProfileSectionCard
      title="Payroll Details"
      description={isStaffView ? "Your tax and bank details (masked)" : undefined}
      icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
      actions={actions}
    >
      {!taxInfo ? (
        <EmptyState 
          title="No payroll details on file" 
          description={isStaffView 
            ? "Contact HR to add your payroll details." 
            : "Payroll details have not been added for this employee yet."
          } 
        />
      ) : (
        <>
          <ProfileInfoGrid columns={2}>
            <ProfileInfoField 
              label={`Tax ID (${taxInfo.taxIdType.toUpperCase()})`} 
              value={taxInfo.taxIdMasked} 
              mono 
            />
            <ProfileInfoField 
              label="Country" 
              value={`${taxInfo.countryName} (${taxInfo.countrySnapshot})`} 
            />
            <ProfileInfoField label="Currency" value={taxInfo.currency} />
            <ProfileInfoField 
              label="Bank Account" 
              value={taxInfo.bankAccountMasked} 
              mono 
            />
            <ProfileInfoField 
              label={`Routing (${taxInfo.bankRoutingType.toUpperCase()})`} 
              value={taxInfo.bankRoutingMasked} 
              mono 
            />
            <ProfileInfoField label="Account Holder" value={taxInfo.bankAccountName} />
            <ProfileInfoField label="Bank Name" value={taxInfo.bankName} />
            <ProfileInfoField label="Account Type" value={taxInfo.bankAccountType} />
          </ProfileInfoGrid>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Update Payroll Details</DialogTitle>
              </DialogHeader>

              {isStaffView && !isVerified && (
                <div className="p-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-500/10">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    ⚠️ You must verify your password before editing bank details.
                  </p>
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                TFN is locked after onboarding. If your TFN is wrong, contact HR.
              </div>

              <Form {...staffForm}>
                <form
                  className="space-y-6 mt-2"
                  onSubmit={staffForm.handleSubmit(async (values) => {
                    try {
                      await updateEmployeeTaxInfo(employeeId, {
                        taxData: {
                          taxFreeThreshold: values.taxFreeThreshold,
                          studentLoan: values.hasHelpDebt,
                          superannuationFund: values.superannuationFund,
                          superannuationMemberNumber: values.superannuationMemberNumber,
                        },
                        bankData: {
                          accountName: values.accountHolderName,
                          accountNumber: values.accountNumber,
                          bsb: values.bsb,
                          bankName: values.bankName,
                          accountType: values.accountType,
                        },
                      })
                      toast.success('Payroll details updated')
                      setOpen(false)
                      setIsVerified(false) // Reset verification for next time
                      await refetch()
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Failed to update payroll details')
                    }
                  })}
                >
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b pb-2">
                      Tax & Super
                    </h3>

                    <FormField
                      control={staffForm.control}
                      name="taxFreeThreshold"
                      render={({ field }: any) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Claim the tax-free threshold</FormLabel>
                            <FormDescription>Only claim from one employer at a time.</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={staffForm.control}
                      name="hasHelpDebt"
                      render={({ field }: any) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>I have a HELP/HECS debt</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={staffForm.control}
                        name="superannuationFund"
                        render={({ field }: any) => (
                          <FormItem>
                            <FormLabel>Super Fund *</FormLabel>
                            <FormControl><Input placeholder="e.g., AustralianSuper" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={staffForm.control}
                        name="superannuationMemberNumber"
                        render={({ field }: any) => (
                          <FormItem>
                            <FormLabel>Member Number *</FormLabel>
                            <FormControl><Input placeholder="Member number" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b pb-2">
                      Bank
                    </h3>

                    <FormField
                      control={staffForm.control}
                      name="bankName"
                      render={({ field }: any) => (
                        <FormItem>
                          <FormLabel>Bank Name *</FormLabel>
                          <FormControl><Input placeholder="e.g., Commonwealth Bank" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={staffForm.control}
                        name="bsb"
                        render={({ field }: any) => (
                          <FormItem>
                            <FormLabel>BSB *</FormLabel>
                            <FormControl><Input placeholder="123-456" inputMode="numeric" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={staffForm.control}
                        name="accountNumber"
                        render={({ field }: any) => (
                          <FormItem>
                            <FormLabel>Account Number *</FormLabel>
                            <FormControl><Input placeholder="12345678" inputMode="numeric" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={staffForm.control}
                      name="accountHolderName"
                      render={({ field }: any) => (
                        <FormItem>
                          <FormLabel>Account Holder *</FormLabel>
                          <FormControl><Input placeholder="Name on account" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={staffForm.control}
                      name="accountType"
                      render={({ field }: any) => (
                        <FormItem>
                          <FormLabel>Account Type *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select account type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="savings">Savings</SelectItem>
                              <SelectItem value="cheque">Cheque</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Save</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Password Verification Dialog for Staff View */}
          {isStaffView && (
            <PasswordVerificationDialog
              open={verifyDialogOpen}
              onOpenChange={setVerifyDialogOpen}
              onVerified={() => {
                setIsVerified(true)
                setOpen(true)
              }}
              title="Verify Your Identity"
              description="Please enter your password to update your bank details. This is required for security purposes."
            />
          )}
        </>
      )}
    </ProfileSectionCard>
  )
}

export function PayrollTab({ employeeId, isStaffView = false }: PayrollTabProps) {
  return (
    <div className="space-y-6">
      {isStaffView && (
        <ProfileSectionCard title="Data Protection">
          <div className="flex gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-md">
            <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-300">
              <p className="font-semibold">Data Protection</p>
              <p className="text-xs mt-1">Sensitive information is encrypted and masked for your privacy.</p>
            </div>
          </div>
        </ProfileSectionCard>
      )}
      
      <TaxInfoSection employeeId={employeeId} isStaffView={isStaffView} />
    </div>
  )
}
