import { z } from "zod"
import { 
  scheduleSchema, 
  scheduleUpdateSchema 
} from "@/lib/validations/schedule"

export type ScheduleCreateRequest = z.infer<typeof scheduleSchema>
export type ScheduleUpdateRequest = z.infer<typeof scheduleUpdateSchema>