import type { EntityId } from "@/shared/types"

export interface PayRunDTO {
  id: EntityId
  status?: string
  /** ISO date-time */
  startDate?: string
  /** ISO date-time */
  endDate?: string
  /** @deprecated use startDate/endDate; kept for older callers */
  payPeriodStart?: string
  payPeriodEnd?: string
  createdAt?: string
  updatedAt?: string
}

