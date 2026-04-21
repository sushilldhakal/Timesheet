"use client"

import { useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw, FileText, Plus } from "lucide-react"
import { useEmployeeContracts } from "@/lib/queries/employees"
import { ContractForm } from "@/components/employees/forms/ContractForm"
import { ContractCard } from "@/components/employees/contracts/ContractCard"
import { ProfileSectionCard } from "@/components/shared/profile"
import { FormDialogShell } from "@/components/shared/forms"

interface ContractTabProps {
  employeeId: string
  canEditPayroll?: boolean
}

function SectionSkeleton() {
  return (
    <ProfileSectionCard title="Loading contracts...">
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </ProfileSectionCard>
  )
}

export function ContractTab({ employeeId, canEditPayroll = false }: ContractTabProps) {
  const { data, isLoading, error, refetch } = useEmployeeContracts(employeeId)
  const [isCreatingContract, setIsCreatingContract] = useState(false)
  const [editingContractId, setEditingContractId] = useState<string | null>(null)

  if (isLoading) return <SectionSkeleton />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground mb-3">Failed to load contracts</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Retry
        </Button>
      </div>
    )
  }

  const contracts = data?.contracts || []

  if (contracts.length === 0 && !isCreatingContract) {
    return (
      <>
        <ProfileSectionCard 
          title="No Contracts"
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
        >
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No Contracts</p>
            <p className="text-xs text-muted-foreground mt-1">
              No contracts have been created for this employee yet.
            </p>
            {canEditPayroll && (
              <Button onClick={() => setIsCreatingContract(true)} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add New Contract
              </Button>
            )}
          </div>
        </ProfileSectionCard>

        <FormDialogShell
          open={isCreatingContract}
          onOpenChange={(open) => {
            if (!open) setIsCreatingContract(false)
          }}
          title="Create New Contract"
          size="lg"
        >
          <ContractForm
            employeeId={employeeId}
            onSuccess={() => {
              setIsCreatingContract(false)
              refetch()
            }}
            onCancel={() => setIsCreatingContract(false)}
          />
        </FormDialogShell>
      </>
    )
  }

  const activeContract = contracts.find(c => c.isActive)
  const pastContracts = contracts.filter(c => !c.isActive)
  const editingContract = editingContractId
    ? contracts.find(c => c.id === editingContractId)
    : undefined

  return (
    <div className="space-y-6">
      {activeContract && (
        <ProfileSectionCard 
          title="Current Contract"
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
        >
          <ContractCard
            contract={activeContract}
            isActive
            canEdit={canEditPayroll}
            onEdit={() => setEditingContractId(activeContract.id)}
            onDelete={() => {
              /* delete not supported via API yet */
            }}
          />
        </ProfileSectionCard>
      )}

      {pastContracts.length > 0 && (
        <ProfileSectionCard 
          title="Previous Contracts"
          icon={<FileText className="h-4 w-4 text-muted-foreground/60" />}
        >
          <div className="space-y-3">
            {pastContracts.map(contract => (
              <ContractCard
                key={contract.id}
                contract={contract}
                isActive={false}
                canEdit={canEditPayroll}
                onEdit={() => setEditingContractId(contract.id)}
              />
            ))}
          </div>
        </ProfileSectionCard>
      )}

      {canEditPayroll && (
        <div className="flex justify-end">
          <Button onClick={() => setIsCreatingContract(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Contract
          </Button>
        </div>
      )}

      <FormDialogShell
        open={isCreatingContract || !!editingContractId}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreatingContract(false)
            setEditingContractId(null)
          }
        }}
        title={isCreatingContract ? 'Create New Contract' : 'Edit Contract'}
        size="lg"
      >
        <ContractForm
          employeeId={employeeId}
          isEditing={!!editingContractId}
          initialData={editingContract}
          onSuccess={() => {
            setIsCreatingContract(false)
            setEditingContractId(null)
            refetch()
          }}
          onCancel={() => {
            setIsCreatingContract(false)
            setEditingContractId(null)
          }}
        />
      </FormDialogShell>
    </div>
  )
}
