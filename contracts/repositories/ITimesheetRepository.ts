import type { EntityId, PaginatedResult, TenantContext } from "@/shared/types"
import type { TimesheetDTO } from "@/contracts/dtos/timesheet"

export interface ITimesheetRepository {
  findById(ctx: TenantContext, id: EntityId): Promise<TimesheetDTO | null>
  findMany(ctx: TenantContext, filters: unknown): Promise<PaginatedResult<TimesheetDTO>>
  create(ctx: TenantContext, data: unknown): Promise<TimesheetDTO>
  update(ctx: TenantContext, id: EntityId, data: unknown): Promise<TimesheetDTO | null>
  delete(ctx: TenantContext, id: EntityId): Promise<boolean>
}

