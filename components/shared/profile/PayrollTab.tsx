"use client"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { AlertCircle, DollarSign, Building, RefreshCw, Globe } from "lucide-react"
import { useEmployeeTaxInfo, useEmployeeBankDetails } from "@/lib/queries/employees"
import { ProfileSectionCard, ProfileInfoGrid, ProfileInfoField } from "@/components/shared/profile"

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
    </div>
  )

  return (
    <ProfileSectionCard
      title="Tax Information"
      description={isStaffView ? "Your tax details (masked, read-only)" : undefined}
      icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
      actions={actions}
    >
      {!taxInfo ? (
        <EmptyState 
          title="No tax info on file" 
          description={isStaffView 
            ? "Contact HR to add your tax details." 
            : "Tax information has not been added for this employee yet."
          } 
        />
      ) : (
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
        </ProfileInfoGrid>
      )}
    </ProfileSectionCard>
  )
}

function BankDetailsSection({ employeeId, isStaffView }: { employeeId: string; isStaffView?: boolean }) {
  const { data, isLoading, error, refetch } = useEmployeeBankDetails(employeeId)

  if (isLoading) return <SectionSkeleton />

  const isNotFound = error && (error as Error).message?.includes("not found")

  if (error && !isNotFound) {
    return (
      <ProfileSectionCard
        title="Banking Details"
        icon={<Building className="h-4 w-4 text-muted-foreground" />}
      >
        <ErrorState message="Failed to load banking details" onRetry={() => refetch()} />
      </ProfileSectionCard>
    )
  }

  const bankDetails = data?.bankDetails

  const actions = bankDetails && (
    <Badge variant="secondary" className="text-xs">Masked</Badge>
  )

  return (
    <ProfileSectionCard
      title="Banking Details"
      description={isStaffView ? "Your banking information for salary deposits (read-only)" : undefined}
      icon={<Building className="h-4 w-4 text-muted-foreground" />}
      actions={actions}
    >
      {!bankDetails ? (
        <EmptyState 
          title="No bank details on file" 
          description={isStaffView 
            ? "Contact HR to add your account information." 
            : "Banking information has not been added for this employee yet."
          } 
        />
      ) : (
        <ProfileInfoGrid columns={2}>
          <ProfileInfoField label="Bank Name" value={bankDetails.bankName} />
          <ProfileInfoField label="Account Number" value={bankDetails.accountNumber} mono />
          <ProfileInfoField label="BSB Code" value={bankDetails.bsbCode} mono />
          <ProfileInfoField label="Account Holder" value={bankDetails.accountHolderName} />
          <ProfileInfoField 
            label="Account Type" 
            value={bankDetails.accountType ? 
              bankDetails.accountType.charAt(0).toUpperCase() + bankDetails.accountType.slice(1) : 
              null
            } 
          />
        </ProfileInfoGrid>
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
      <BankDetailsSection employeeId={employeeId} isStaffView={isStaffView} />
    </div>
  )
}