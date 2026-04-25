import type { EntityId } from "@/shared/types"

export type UserRole = "admin" | "manager" | "supervisor" | "accounts" | "user" | "super_admin"

export interface UserDTO {
  id: EntityId
  tenantId: EntityId | null
  name: string
  email: string
  role: UserRole
  location: string[]
  managedRoles: string[]
  rights: string[]
}

