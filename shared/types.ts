export type EntityId = string

export type TenantContext = {
  tenantId: string
}

export type PaginationParams = {
  page: number
  limit: number
}

export type PaginatedResult<T> = {
  data: T[]
  total: number
  page: number
}

