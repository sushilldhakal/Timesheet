import { apiFetch } from './fetch-client'

export interface Org {
  id: string
  name: string
  slug: string
}

export interface OrgsResponse {
  orgs: Org[]
}

// Get all orgs for the current user (pre-auth or authenticated)
export async function getOrgs(): Promise<OrgsResponse> {
  return apiFetch<OrgsResponse>('/api/auth/orgs')
}

// Get all orgs for super admin (requires super_admin role)
export async function getSuperAdminOrgs(): Promise<OrgsResponse> {
  return apiFetch<OrgsResponse>('/api/superadmin/orgs')
}

// Switch to a different org (authenticated users with multiple orgs)
export async function switchOrg(tenantId: string): Promise<void> {
  return apiFetch<void>('/api/auth/switch-org', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId }),
  })
}

// Reset super admin context back to sentinel mode (all organizations view)
export async function resetSuperAdminContext(): Promise<void> {
  return apiFetch<void>('/api/superadmin/reset-context', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
}

// Select an org during the pre-auth flow (select-org page)
export async function selectOrg(tenantId: string): Promise<void> {
  return apiFetch<void>('/api/auth/select-org', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId }),
  })
}
