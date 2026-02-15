import { z } from "zod"

export const clockTypeEnum = z.enum(["in", "out", "break", "endBreak"])

export const clockBodySchema = z.object({
  pin: z.string().min(1, "PIN required"),
  image: z.string().optional(),
  lat: z.string().optional(),
  lng: z.string().optional(),
})

export const clockTypeParamSchema = z.object({
  type: clockTypeEnum,
})

export const timesheetUpdateSchema = z.object({
  user_id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid user ObjectId"),
  date: z.string().min(1),
  in: z.string().optional(),
  out: z.string().optional(),
  break: z.string().optional(),
  endBreak: z.string().optional(),
})

export const staffIdParamSchema = z.object({
  staff_id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid staff ObjectId"),
})

export const pinLoginSchema = z.object({
  pin: z.string().regex(/^\d{4,}$/, "PIN must be 4+ digits").max(10),
})

export type ClockBodyInput = z.infer<typeof clockBodySchema>
export type TimesheetUpdateInput = z.infer<typeof timesheetUpdateSchema>
export type PinLoginInput = z.infer<typeof pinLoginSchema>
