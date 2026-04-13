"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { AlertCircle, DollarSign, Building, RefreshCw, Globe } from "lucide-react"
import { useEmployeeTaxInfo, useEmployeeBankDetails } from "@/lib/queries/employees"

interface PayrollTabProps {
  employeeId: string
}

function SectionSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </CardContent>
    </Card>
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

function InfoField({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`text-sm ${mono ? "font-mono" : ""}`}>
        {value || <span className="text-muted-foreground">—</span>}
      </p>
    </div>
  )
}

function TaxInfoSection({ employeeId }: { employeeId: string }) {
  const { data, isLoading, error, refetch } = useEmployeeTaxInfo(employeeId)

  if (isLoading) return <SectionSkeleton />

  const isNotFound = error && (error as Error).message?.includes("not found")

  if (error && !isNotFound) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Tax Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState message="Failed to load tax information" onRetry={() => refetch()} />
        </CardContent>
      </Card>
    )
  }

  const taxInfo = data?.taxInfo

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Tax Information
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {taxInfo && (
              <>
                <Badge variant="outline" className="text-xs gap-1">
                  <Globe className="h-3 w-3" />
                  {taxInfo.countryName}
                </Badge>
                <Badge variant="secondary" className="text-xs">Encrypted</Badge>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!taxInfo ? (
          <EmptyState title="No tax info on file" description="Tax information has not been added for this employee yet." />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <InfoField label={`Tax ID (${taxInfo.taxIdType.toUpperCase()})`} value={taxInfo.taxIdMasked} mono />
            <InfoField label="Country" value={`${taxInfo.countryName} (${taxInfo.countrySnapshot})`} />
            <InfoField label="Currency" value={taxInfo.currency} />
            <InfoField label="Bank Account" value={taxInfo.bankAccountMasked} mono />
            <InfoField label={`Routing (${taxInfo.bankRoutingType.toUpperCase()})`} value={taxInfo.bankRoutingMasked} mono />
            <InfoField label="Account Holder" value={taxInfo.bankAccountName} />
            <InfoField label="Bank Name" value={taxInfo.bankName} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function BankDetailsSection({ employeeId }: { employeeId: string }) {
  const { data, isLoading, error, refetch } = useEmployeeBankDetails(employeeId)

  if (isLoading) return <SectionSkeleton />

  const isNotFound = error && (error as Error).message?.includes("not found")

  if (error && !isNotFound) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            Banking Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState message="Failed to load banking details" onRetry={() => refetch()} />
        </CardContent>
      </Card>
    )
  }

  const bankDetails = data?.bankDetails

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            Banking Details
          </CardTitle>
          {bankDetails && <Badge variant="secondary" className="text-xs">Masked</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {!bankDetails ? (
          <EmptyState title="No bank details on file" description="Banking information has not been added for this employee yet." />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <InfoField label="Bank Name" value={bankDetails.bankName} />
            <InfoField label="Account Number" value={bankDetails.accountNumber} mono />
            <InfoField label="BSB Code" value={bankDetails.bsbCode} mono />
            <InfoField label="Account Holder" value={bankDetails.accountHolderName} />
            <InfoField label="Account Type" value={bankDetails.accountType ? bankDetails.accountType.charAt(0).toUpperCase() + bankDetails.accountType.slice(1) : null} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function PayrollTab({ employeeId }: PayrollTabProps) {
  return (
    <div className="space-y-6">
      <TaxInfoSection employeeId={employeeId} />
      <BankDetailsSection employeeId={employeeId} />
    </div>
  )
}
