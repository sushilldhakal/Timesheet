import { z } from "zod"
import mongoose from "mongoose"

/**
 * Validation schema for creating a schedule
 */
export const scheduleCreateSchema = z
  .object({
    dayOfWeek: z
      .array(z.number().int().min(0).max(6))
      .min(1, "At least one day of week is required")
      .refine(
        (days) => {
          const uniqueDays = new Set(days)
          return uniqueDays.size === days.length
        },
        { message: "dayOfWeek must not contain duplicate values" }
      ),
    startTime: z.date({
      required_error: "startTime is required",
      invalid_type_error: "startTime must be a Date",
    }),
    endTime: z.date({
      required_error: "endTime is required",
      invalid_type_error: "endTime must be a Date",
    }),
    locationId: z
      .string()
      .regex(/^[a-fA-F0-9]{24}$/, "Invalid MongoDB ObjectId for locationId")
      .transform((val) => new mongoose.Types.ObjectId(val)),
    roleId: z
      .string()
      .regex(/^[a-fA-F0-9]{24}$/, "Invalid MongoDB ObjectId for roleId")
      .transform((val) => new mongoose.Types.ObjectId(val)),
    effectiveFrom: z.date({
      required_error: "effectiveFrom is required",
      invalid_type_error: "effectiveFrom must be a Date",
    }),
    effectiveTo: z
      .date({
        invalid_type_error: "effectiveTo must be a Date",
      })
      .nullable()
      .optional()
      .default(null),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "startTime must be less than endTime",
    path: ["startTime"],
  })
  .refine(
    (data) => {
      if (data.effectiveTo === null) return true
      return data.effectiveFrom <= data.effectiveTo
    },
    {
      message: "effectiveFrom must be less than or equal to effectiveTo",
      path: ["effectiveFrom"],
    }
  )

/**
 * Validation schema for updating a schedule
 */
export const scheduleUpdateSchema = z
  .object({
    dayOfWeek: z
      .array(z.number().int().min(0).max(6))
      .min(1, "At least one day of week is required")
      .refine(
        (days) => {
          const uniqueDays = new Set(days)
          return uniqueDays.size === days.length
        },
        { message: "dayOfWeek must not contain duplicate values" }
      )
      .optional(),
    startTime: z
      .date({
        invalid_type_error: "startTime must be a Date",
      })
      .optional(),
    endTime: z
      .date({
        invalid_type_error: "endTime must be a Date",
      })
      .optional(),
    locationId: z
      .string()
      .regex(/^[a-fA-F0-9]{24}$/, "Invalid MongoDB ObjectId for locationId")
      .transform((val) => new mongoose.Types.ObjectId(val))
      .optional(),
    roleId: z
      .string()
      .regex(/^[a-fA-F0-9]{24}$/, "Invalid MongoDB ObjectId for roleId")
      .transform((val) => new mongoose.Types.ObjectId(val))
      .optional(),
    effectiveFrom: z
      .date({
        invalid_type_error: "effectiveFrom must be a Date",
      })
      .optional(),
    effectiveTo: z
      .date({
        invalid_type_error: "effectiveTo must be a Date",
      })
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return data.startTime < data.endTime
      }
      return true
    },
    {
      message: "startTime must be less than endTime",
      path: ["startTime"],
    }
  )
  .refine(
    (data) => {
      if (data.effectiveFrom && data.effectiveTo !== undefined) {
        if (data.effectiveTo === null) return true
        return data.effectiveFrom <= data.effectiveTo
      }
      return true
    },
    {
      message: "effectiveFrom must be less than or equal to effectiveTo",
      path: ["effectiveFrom"],
    }
  )

/**
 * Validation for schedule ID parameter
 */
export const scheduleIdParamSchema = z.object({
  scheduleId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid MongoDB ObjectId"),
})

export type ScheduleCreateInput = z.infer<typeof scheduleCreateSchema>
export type ScheduleUpdateInput = z.infer<typeof scheduleUpdateSchema>
