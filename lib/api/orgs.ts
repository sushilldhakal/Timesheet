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

// Switch to a different org (authenticated users with multiple orgs)
export async function switchOrg(tenantId: string): Promise<void> {
  return apiFetch<void>('/api/auth/switch-org', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId }),
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
