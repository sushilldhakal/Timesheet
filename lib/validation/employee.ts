import { z } from "zod"

export const employeeCreateSchema = z.object({
  name: z.string().min(1, "Name required").max(200).trim(),
  pin: z.string().min(4, "PIN at least 4 characters").max(20).trim(),
  role: z.array(z.string().trim()).default([]),
  employer: z.array(z.string().trim()).default([]),
  location: z.array(z.string().trim()).default([]),
  email: z.string().trim().optional().default(""),
  phone: z.string().trim().optional().default(""),
  dob: z.string().trim().optional().default(""),
  comment: z.string().trim().optional().default(""),
  img: z.string().optional().default(""),
})

const stringArray = z.union([z.string(), z.array(z.string())]).transform((v) => (Array.isArray(v) ? v.map((s) => String(s).trim()).filter(Boolean) : v ? [String(v).trim()] : []))

export const employeeUpdateSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  pin: z.string().min(4).max(20).trim().optional(),
  role: stringArray.optional(),
  employer: stringArray.optional(),
  location: stringArray.optional(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  dob: z.string().trim().optional(),
  comment: z.string().trim().optional(),
  img: z.string().optional(),
})

export const employeeIdParamSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid MongoDB ObjectId"),
})

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>
