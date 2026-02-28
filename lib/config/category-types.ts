/**
 * Category types for Role, Employer, Location
 * Used for employee assignment and category management
 */
export const CATEGORY_TYPES = {
  ROLE: "role",
  EMPLOYER: "employer",
  LOCATION: "location",
} as const

export type CategoryType =
  | (typeof CATEGORY_TYPES)[keyof typeof CATEGORY_TYPES]

export const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  [CATEGORY_TYPES.ROLE]: "Role",
  [CATEGORY_TYPES.EMPLOYER]: "Employer",
  [CATEGORY_TYPES.LOCATION]: "Location",
}

export const CATEGORY_TYPES_LIST: CategoryType[] = Object.values(CATEGORY_TYPES)

export function isValidCategoryType(value: string): value is CategoryType {
  return CATEGORY_TYPES_LIST.includes(value as CategoryType)
}
