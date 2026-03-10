import { z } from "zod";

export const eventSchema = z
  .object({
    // Staff/User - Array for multi-select
    users: z.array(z.string()).min(1, { message: "At least one staff member is required" }),

    // Single location and role selection (required for location-scoped roles)
    locationId: z.string().min(1, { message: "Location is required" }),
    roleId: z.string().min(1, { message: "Role is required" }),
    
    // Employer - Optional for filtering
    employerId: z.string().optional(),

    // Legacy fields for backward compatibility (optional arrays for filtering)
    roleIds: z.array(z.string()).optional(),
    locationIds: z.array(z.string()).optional(),
    employerIds: z.array(z.string()).optional(),

    // Title and notes
    title: z.string().optional(),
    notes: z.string().optional(),

    // Date and time
    startDate: z.date({ message: "Start date is required" }),
    startTime: z.object({ hour: z.number(), minute: z.number() }, { message: "Start time is required" }),
    endDate: z.date({ message: "End date is required" }),
    endTime: z.object({ hour: z.number(), minute: z.number() }, { message: "End time is required" }),

    // Break time in minutes
    breakMinutes: z.number().min(0).optional().default(30),

    // Color (optional)
    color: z.enum(["blue", "green", "red", "yellow", "purple", "orange", "gray"]).optional(),
  })
  .refine(
    data => {
      const startDateTime = new Date(data.startDate);
      startDateTime.setHours(data.startTime.hour, data.startTime.minute, 0, 0);

      const endDateTime = new Date(data.endDate);
      endDateTime.setHours(data.endTime.hour, data.endTime.minute, 0, 0);

      return startDateTime < endDateTime;
    },
    {
      message: "Start time must be before end time",
      path: ["endTime"],
    }
  )

export type TEventFormData = z.infer<typeof eventSchema>;

// Legacy schema for edit dialog (backward compatibility)
export const editEventSchema = z
  .object({
    user: z.string().min(1, { message: "User is required" }),
    title: z.string().optional(),
    description: z.string().optional(),
    startDate: z.date({ message: "Start date is required" }),
    startTime: z.object({ hour: z.number(), minute: z.number() }, { message: "Start time is required" }),
    endDate: z.date({ message: "End date is required" }),
    endTime: z.object({ hour: z.number(), minute: z.number() }, { message: "End time is required" }),
    color: z.enum(["blue", "green", "red", "yellow", "purple", "orange", "gray"]).optional(),
  })
  .refine(
    data => {
      const startDateTime = new Date(data.startDate);
      startDateTime.setHours(data.startTime.hour, data.startTime.minute, 0, 0);

      const endDateTime = new Date(data.endDate);
      endDateTime.setHours(data.endTime.hour, data.endTime.minute, 0, 0);

      return startDateTime < endDateTime;
    },
    {
      message: "Start time must be before end time",
      path: ["endTime"],
    }
  )

export type TEditEventFormData = z.infer<typeof editEventSchema>;
