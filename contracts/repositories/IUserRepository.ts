import type { EntityId, TenantContext } from "@/shared/types"
import type { UserDTO } from "@/contracts/dtos/user"

export interface IUserRepository {
  findById(ctx: TenantContext, id: EntityId): Promise<UserDTO | null>
}

