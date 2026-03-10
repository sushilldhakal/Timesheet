import { z } from 'zod'

// Parameter schemas
export const shiftSwapIdParamSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid shift swap ID format"),
})

// Query schemas
export const shiftSwapQuerySchema = z.object({
  status: z.string().optional(),
  employeeId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid employee ID format").optional(),
})

// Request schemas
export const createShiftSwapSchema = z.object({
  requestorId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid requestor ID format"),
  recipientId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid recipient ID format"),
  shiftAssignmentId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid shift assignment ID format"),
  reason: z.string().optional(),
})

export const approveShiftSwapSchema = z.object({
  managerId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid manager ID format"),
  organizationId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid organization ID format"),
})

export const denyShiftSwapSchema = z.object({
  managerId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid manager ID format"),
  reason: z.string().min(1, "Reason is required"),
})

export const acceptShiftSwapSchema = z.object({
  recipientId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid recipient ID format"),
})

// Response schemas
export const shiftSwapRequestsResponseSchema = z.object({
  swapRequests: z.array(z.any()), // Complex swap request structure
})

export const shiftSwapRequestResponseSchema = z.object({
  swapRequest: z.any(), // Complex swap request structure
})