export type TimesheetTimeSource = "insert" | "update"

export interface DailyTimesheetRow {
  date: string
  clockIn: string
  breakIn: string
  breakOut: string
  clockOut: string
  breakMinutes: number
  breakHours: string
  totalMinutes: number
  totalHours: string
  clockInImage?: string
  clockInWhere?: string
  breakInImage?: string
  breakInWhere?: string
  breakOutImage?: string
  breakOutWhere?: string
  clockOutImage?: string
  clockOutWhere?: string
  clockInSource?: TimesheetTimeSource
  breakInSource?: TimesheetTimeSource
  breakOutSource?: TimesheetTimeSource
  clockOutSource?: TimesheetTimeSource
}