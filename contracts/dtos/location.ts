import type { EntityId } from "@/shared/types"

export interface LocationDTO {
  id: EntityId
  name: string
  address?: string
  lat?: number
  lng?: number
  radius?: number
  geofenceMode?: string
  openingHour?: number
  closingHour?: number
  workingDays?: unknown[]
  country?: string
  color?: string
}

