export type FlagIssueType = "no_image" | "no_location" | "no_image_no_location"

export interface FlagRow {
  id: string
  employeeId: string
  date: string
  pin: string
  name: string
  type: string
  typeLabel: string
  hasImage: boolean
  hasLocation: boolean
  issueType: FlagIssueType
}
