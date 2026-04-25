import type { EntityId } from "@/shared/types"

export interface TeamDTO {
  id: EntityId
  name: string
  color?: string
  type?: string
}

