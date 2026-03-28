// Minimal interface shim used by API routes.
// Keep this file lightweight so server code can type-check.

export interface IUser {
  id: string
  name: string
  picturePath?: string | null
}

export interface IEvent {
  id: number | string
  startDate: string
  endDate: string
  title: string
  color?: string
  description?: string
  user: IUser
  /** Present when sourced from roster shifts */
  shiftStatus?: "draft" | "published"
  /** Resolved employer label for roster cards ("Own staff" when none) */
  employerBadge?: string
}

