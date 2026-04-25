import type { EntityId, PaginatedResult, TenantContext } from "@/shared/types"
import type { PayRunDTO } from "@/contracts/dtos/payrun"

export interface IPayRunRepository {
  findById(ctx: TenantContext, id: EntityId): Promise<PayRunDTO | null>
  findMany(ctx: TenantContext, filters: unknown): Promise<PaginatedResult<PayRunDTO>>
  create(ctx: TenantContext, data: unknown): Promise<PayRunDTO>
  update(ctx: TenantContext, id: EntityId, data: unknown): Promise<PayRunDTO | null>
  delete(ctx: TenantContext, id: EntityId): Promise<boolean>
}

