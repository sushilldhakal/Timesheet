import { z } from "zod"
import { 
  timesheetCreateSchema, 
  timesheetUpdateSchema, 
  clockActionSchema, 
  timesheetPostSchema, 
  timesheetQuerySchema, 
  timesheetResponseSchema 
} from "@/lib/validations/timesheet"

export type TimesheetCreateRequest = z.infer<typeof timesheetCreateSchema>
export type TimesheetUpdateRequest = z.infer<typeof timesheetUpdateSchema>
export type ClockActionRequest = z.infer<typeof clockActionSchema>
export type TimesheetPostRequest = z.infer<typeof timesheetPostSchema>
export type TimesheetQuery = z.infer<typeof timesheetQuerySchema>
export type TimesheetResponse = z.infer<typeof timesheetResponseSchema>