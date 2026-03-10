import { z } from "zod"
import { 
  timesheetCreateSchema, 
  timesheetUpdateSchema, 
  clockActionSchema, 
  timesheetPostSchema, 
  timesheetQuerySchema, 
  timesheetResponseSchema 
} from "@/lib/validations/timesheet"

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

export type TimesheetCreateRequest = z.infer<typeof timesheetCreateSchema>
export type TimesheetUpdateRequest = z.infer<typeof timesheetUpdateSchema>
export type ClockActionRequest = z.infer<typeof clockActionSchema>
export type TimesheetPostRequest = z.infer<typeof timesheetPostSchema>
export type TimesheetQuery = z.infer<typeof timesheetQuerySchema>
export type TimesheetResponse = z.infer<typeof timesheetResponseSchema>