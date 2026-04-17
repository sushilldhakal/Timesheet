export type EntityType = "team" | "teamGroup" | "employer" | "location"

export type CategoryRow = {
  id: string
  name: string
  type: EntityType
  lat?: number
  lng?: number
  radius?: number
  geofenceMode?: "hard" | "soft"
  openingHour?: number
  closingHour?: number
  workingDays?: number[]
  color?: string
  abn?: string
  contactEmail?: string
  defaultAwardId?: string
  description?: string
  isActive?: boolean
  /** Team group id (API uses `groupId` in some endpoints). */
  groupId?: string | null
  /** Team group display name (populated by API on team list/get). */
  groupName?: string | null
  /** Historical snapshot for display if group is deleted/renamed. */
  groupSnapshot?: { name?: string } | null
  /** Workforce team group (not wired yet — reserved for a follow-up) */
  teamGroup?: string | null
  /** Display sort; lower first. */
  order?: number
  /** Team group colour (from API when group assigned). */
  groupColor?: string
  staffCount?: number
  managerCount?: number
  defaultScheduleTemplate?: {
    standardHoursPerWeek?: number
    shiftPattern?: {
      dayOfWeek?: number[]
      startHour?: number
      endHour?: number
      description?: string
    }
  }
  createdAt?: string
  updatedAt?: string
}
