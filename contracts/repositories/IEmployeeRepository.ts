import type { EntityId, TenantContext } from "@/shared/types"
import type { EmployeeCreatePersistInput, EmployeeDTO } from "@/contracts/dtos/employee"

export interface IEmployeeRepository {
  listEmployees(ctx: TenantContext, query: unknown): Promise<{ employees: EmployeeDTO[]; total: number; limit: number; offset: number }>
  pinExistsForTenant(ctx: TenantContext, pin: string): Promise<boolean>
  resolveOnboardingCountryForLocationName(ctx: TenantContext, firstLocationName: string | undefined): Promise<string>
  createEmployee(ctx: TenantContext, data: EmployeeCreatePersistInput): Promise<{ employee: EmployeeDTO }>
  getEmployeeDetail(ctx: TenantContext, id: EntityId): Promise<{ employee: EmployeeDTO }>
  updateEmployee(ctx: TenantContext, id: EntityId, data: unknown): Promise<{ employee: EmployeeDTO }>
  deleteEmployee(ctx: TenantContext, id: EntityId): Promise<{ success: true }>
}

