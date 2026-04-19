"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, ChevronsUpDown, Check, Loader2 } from "lucide-react"
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
import { getOrgs, switchOrg } from "@/lib/api/orgs"

interface OrgSwitcherProps {
  /** The tenantId currently active in the session (from JWT / auth context) */
  currentTenantId?: string
  /** Display name of the current org */
  currentOrgName?: string
}

/**
 * OrgSwitcher — shown in the dashboard header when a user belongs to 2+ orgs.
 *
 * Fetches the org list lazily (only when the dropdown is opened for the first time).
 * On selection, calls POST /api/auth/switch-org and refreshes the page so the new
 * JWT is picked up by all server components.
 */
export function OrgSwitcher({ currentTenantId, currentOrgName }: OrgSwitcherProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ["auth", "orgs"],
    queryFn: () => getOrgs().then((r) => r.orgs),
    // Fetch eagerly on mount so we know whether to render the switcher at all
    staleTime: 5 * 60 * 1000,
  })

  const switchMutation = useMutation({
    mutationFn: switchOrg,
    onSuccess: () => {
      // Clear all cached queries so the new tenant context is reflected everywhere
      queryClient.clear()
      router.refresh()
    },
    onError: (err: any) => {
      toast.error(err.message ?? "Could not switch organisation")
    },
  })

  // Hide when we have confirmed there is only one org.
  // While loading we keep rendering so the layout doesn't shift.
  const hasMultipleOrgs = isLoading || orgs.length > 1
  if (!hasMultipleOrgs) return null

  const displayName = currentOrgName ?? "Organisation"

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:flex h-8 max-w-[180px] items-center gap-1.5 px-2.5 text-xs font-medium"
          aria-label="Switch organisation"
        >
          <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate">{displayName}</span>
          <ChevronsUpDown className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Switch organisation
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : orgs.length === 0 ? (
          <div className="px-2 py-3 text-xs text-muted-foreground text-center">
            No other organisations
          </div>
        ) : (
          orgs.map((org) => {
            const isCurrent = org.id === currentTenantId
            const isSwitching = switchMutation.isPending && switchMutation.variables === org.id

            return (
              <DropdownMenuItem
                key={org.id}
                disabled={isCurrent || switchMutation.isPending}
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
