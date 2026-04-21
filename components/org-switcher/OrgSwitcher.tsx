"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, ChevronsUpDown, Check, Loader2, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getOrgs, getSuperAdminOrgs, switchOrg, resetSuperAdminContext } from "@/lib/api/orgs"
import { SUPER_ADMIN_SENTINEL } from "@/lib/auth/auth-constants"

interface OrgSwitcherProps {
  /** The tenantId currently active in the session (from JWT / auth context) */
  currentTenantId?: string
  /** Display name of the current org */
  currentOrgName?: string
  /** Whether the current user is a super admin */
  isSuperAdmin?: boolean
}

/**
 * OrgSwitcher — shown in the dashboard header for super admins only.
 *
 * For super admins:
 * - Uses /api/superadmin/orgs to fetch all organizations
 * - Shows "All Organizations" option to return to sentinel mode
 * - Always renders (super admin can switch between platform view and org view)
 *
 * For regular users (admin, manager, etc.):
 * - Does NOT render - they are bound to their organization
 */
export function OrgSwitcher({ currentTenantId, currentOrgName, isSuperAdmin = false }: OrgSwitcherProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  // Only show for super admins
  if (!isSuperAdmin) return null

  // Use different query based on user type
  const queryKey = isSuperAdmin ? ["superadmin", "orgs"] : ["auth", "orgs"]
  const queryFn = isSuperAdmin ? () => getSuperAdminOrgs().then((r) => r.orgs) : () => getOrgs().then((r) => r.orgs)

  const { data: orgs = [], isLoading } = useQuery({
    queryKey,
    queryFn,
    staleTime: 5 * 60 * 1000,
  })

  const switchMutation = useMutation({
    mutationFn: switchOrg,
    onSuccess: () => {
      queryClient.clear()
      router.refresh()
    },
    onError: (err: any) => {
      console.error('Org switch error:', err)
      const errorMessage = err.message ?? "Could not switch organisation"
      toast.error(errorMessage)
      // Refetch org list in case it's stale
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const resetMutation = useMutation({
    mutationFn: resetSuperAdminContext,
    onSuccess: () => {
      queryClient.clear()
      router.refresh()
    },
    onError: (err: any) => {
      toast.error(err.message ?? "Could not reset to all organizations view")
    },
  })

  const isInSentinelMode = currentTenantId === SUPER_ADMIN_SENTINEL
  const displayName = isInSentinelMode ? "All Organizations" : (currentOrgName ?? "Organisation")

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex h-8 max-w-[180px] items-center gap-1.5 px-2.5 text-xs font-medium"
          aria-label="Switch organisation"
        >
          {isInSentinelMode ? (
            <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          ) : (
            <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
          <span className="truncate">{displayName}</span>
          <ChevronsUpDown className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Select Organization View
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Super admin: show "All Organizations" option */}
        <DropdownMenuItem
          disabled={isInSentinelMode || resetMutation.isPending || switchMutation.isPending}
          onSelect={() => {
            if (!isInSentinelMode) {
              setOpen(false)
              resetMutation.mutate()
            }
          }}
          className="flex items-center gap-2 cursor-pointer"
        >
          {resetMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
          ) : isInSentinelMode ? (
            <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          ) : (
            <Globe className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
          <span className="truncate">All Organizations</span>
          {isInSentinelMode && (
            <span className="ml-auto text-[10px] text-muted-foreground">current</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : orgs.length === 0 ? (
          <div className="px-2 py-3 text-xs text-muted-foreground text-center">
            No organizations found
          </div>
        ) : (
          orgs.map((org) => {
            const isCurrent = org.id === currentTenantId
            const isSwitching = switchMutation.isPending && switchMutation.variables === org.id

            return (
              <DropdownMenuItem
                key={org.id}
                disabled={isCurrent || switchMutation.isPending || resetMutation.isPending}
                onSelect={() => {
                  if (!isCurrent) {
                    setOpen(false)
                    switchMutation.mutate(org.id)
                  }
                }}
                className="flex items-center gap-2 cursor-pointer"
              >
                {isSwitching ? (
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
                ) : isCurrent ? (
                  <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                ) : (
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                <span className="truncate">{org.name}</span>
                {isCurrent && (
                  <span className="ml-auto text-[10px] text-muted-foreground">current</span>
                )}
              </DropdownMenuItem>
            )
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
