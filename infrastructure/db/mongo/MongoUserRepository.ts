import type { IUserRepository } from "@/contracts/repositories/IUserRepository"
import type { EntityId, TenantContext } from "@/shared/types"
import type { UserDTO } from "@/contracts/dtos/user"
import { connectDB } from "@/lib/db"
import { User } from "@/lib/db/schemas/user"
import { SUPER_ADMIN_SENTINEL } from "@/lib/auth/auth-constants"

function toUserDTO(doc: any): UserDTO {
  return {
    id: String(doc._id),
    tenantId: doc.tenantId ? String(doc.tenantId) : null,
    name: String(doc.name ?? ""),
    email: String(doc.email ?? ""),
    role: doc.role,
    location: Array.isArray(doc.location) ? doc.location : doc.location ? [doc.location] : [],
    managedRoles: Array.isArray(doc.managedRoles) ? doc.managedRoles : [],
    rights: Array.isArray(doc.rights) ? doc.rights : [],
  }
}

export class MongoUserRepository implements IUserRepository {
  async findById(ctx: TenantContext, id: EntityId): Promise<UserDTO | null> {
    await connectDB()

    // tenantId is a required part of repository calls; super_admin uses sentinel.
    // In Mongo, super_admin users are stored with tenantId: null.
    const filter =
      ctx.tenantId === SUPER_ADMIN_SENTINEL
        ? { _id: id, tenantId: null }
        : { _id: id, tenantId: ctx.tenantId }

    const user = await User.findOne(filter).lean()
    if (!user) return null
    return toUserDTO(user)
  }
}

