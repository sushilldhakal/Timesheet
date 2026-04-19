import { apiFetch } from './fetch-client'

const BASE_URL = '/api/public-holidays'

export interface PublicHoliday {
  _id: string
  date: string | Date
  name: string
  state: string
  isRecurring: boolean
  createdAt: string | Date
}

export interface GetPublicHolidaysParams {
  year: number
  state?: string
}

export interface CreatePublicHolidayRequest {
  date: string
  name: string
  state: string
  isRecurring: boolean
}

// List public holidays for a year/state
export async function getPublicHolidays(
  params: GetPublicHolidaysParams
): Promise<{ publicHolidays: PublicHoliday[] }> {
  const sp = new URLSearchParams()
  sp.set('year', String(params.year))
  if (params.state && params.state !== 'All') sp.set('state', params.state)
  return apiFetch<{ publicHolidays: PublicHoliday[] }>(`${BASE_URL}?${sp.toString()}`)
}

// Create a public holiday
export async function createPublicHoliday(
  data: CreatePublicHolidayRequest
): Promise<{ publicHoliday: PublicHoliday }> {
  return apiFetch<{ publicHoliday: PublicHoliday }>(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Delete a public holiday by id
export async function deletePublicHoliday(id: string): Promise<void> {
  return apiFetch<void>(`${BASE_URL}/${id}`, { method: 'DELETE' })
}

// Seed public holidays for a year
export async function seedPublicHolidays(year: number): Promise<{ upserted: number }> {
  return apiFetch<{ upserted: number }>(`${BASE_URL}/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ year }),
  })
}
