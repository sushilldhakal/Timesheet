import { z } from 'zod';

export const createTimesheetSchema = z.object({
  tenantId: z.string().min(1),
  employeeId: z.string().min(1),
  payPeriodStart: z.string().transform((str) => new Date(str)),
  payPeriodEnd: z.string().transform((str) => new Date(str)),
});

export type CreateTimesheetInput = z.infer<typeof createTimesheetSchema>;

