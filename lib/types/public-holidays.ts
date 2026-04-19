// Re-export types from API layer for centralized access
export type { PublicHoliday, GetPublicHolidaysParams, CreatePublicHolidayRequest } from '@/lib/api/public-holidays'

// State option type
export type StateOption = 'NAT' | 'VIC' | 'NSW' | 'QLD' | 'SA' | 'WA' | 'TAS' | 'ACT' | 'NT'
