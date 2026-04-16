'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, Loader2, AlertCircle } from 'lucide-react'
import { getEmployeeTaxInfo, getEmployeeBankDetails } from '@/lib/api/employees'

interface StaffPayrollTabProps {
  employeeId: string
}

function maskTFN(tfn: string): string {
  if (!tfn || tfn.length < 3) return '***-***-***'
  return `***-***-${tfn.slice(-3)}`
}

function maskAccountNumber(account: string): string {
  if (!account || account.length < 4) return '--------'
  return `****${account.slice(-4)}`
}

export function StaffPayrollTab({ employeeId }: StaffPayrollTabProps) {
  const { data: taxData, isLoading: taxLoading } = useQuery({
    queryKey: ['employeeTaxInfo', employeeId],
    queryFn: () => getEmployeeTaxInfo(employeeId),
  })

  const { data: bankData, isLoading: bankLoading } = useQuery({
    queryKey: ['employeeBankDetails', employeeId],
    queryFn: () => getEmployeeBankDetails(employeeId),
  })

  if (taxLoading || bankLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const taxInfo = taxData?.taxInfo
  const bankDetails = bankData?.bankDetails

  return (
    <div className="space-y-6">
      <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-300">
              <p className="font-semibold">Data Protection</p>
              <p className="text-xs mt-1">Sensitive information is encrypted and masked for your privacy.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Tax Information
          </CardTitle>
          <CardDescription>Your tax details (masked, read-only)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {taxInfo ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Tax ID Type</p>
                  <p className="text-sm font-semibold mt-1">{taxInfo.taxIdType || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Tax ID (masked)</p>
                  <p className="text-sm font-mono font-semibold mt-1">{taxInfo.taxIdMasked || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Country</p>
                  <p className="text-sm font-semibold mt-1">{taxInfo.countryName || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Currency</p>
                  <p className="text-sm font-semibold mt-1">{taxInfo.currency || '—'}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No tax information on file. Contact HR to add your details.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Bank Details
          </CardTitle>
          <CardDescription>Your banking information for salary deposits (read-only)</CardDescription>
        </CardHeader>
        <CardContent>
          {bankDetails ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Bank Name</p>
                <p className="text-sm font-semibold mt-1">{bankDetails.bankName || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Account Type</p>
                <p className="text-sm font-semibold mt-1 capitalize">{bankDetails.accountType || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Account Number</p>
                <p className="text-sm font-mono font-semibold mt-1">
                  {maskAccountNumber(bankDetails.accountNumber || '')}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">BSB Code</p>
                <p className="text-sm font-mono font-semibold mt-1">{bankDetails.bsbCode || 'Not provided'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">Account Holder Name</p>
                <p className="text-sm font-semibold mt-1">{bankDetails.accountHolderName || 'Not provided'}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No bank details on file. Contact HR to add your account information.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
