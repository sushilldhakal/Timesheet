// Common schemas
export { objectIdSchema, mongoIdSchema, dateTimeSchema, dateSchema, emailSchema, phoneSchema, pinSchema } from "./common"

// Auth schemas (preferred for login-related schemas)
export { 
  loginSchema,
  pinLoginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  setupPasswordSchema
} from "./auth"

// User schemas (excluding duplicates)
export { 
  userCreateSchema,
  userUpdateSchema,
  userResponseSchema,
  adminCreateSchema,
  userAdminUpdateSchema,
  userSelfUpdateSchema
} from "./user"

// Employee schemas (excluding duplicates)
export {
  employeeCreateSchema,
  employeeUpdateSchema,
  employeeResponseSchema,
  assignRoleSchema,
  updateAssignmentSchema,
  employeeQuerySchema
} from "./employee"

// Use common schemas for param validation (single source of truth)
export { 
  idParamSchema,
} from "./common"

// Other schemas without conflicts
export * from "./schedule"
export * from "./roster"
export * from "./dashboard"
export * from "./analytics"
export * from "./shift-swap"
export * from "./location"
export * from "./device"
export * from "./admin"
export * from "./employee-clock"
export * from "./awards"

// Master data schemas
export * from "./team"
export * from "./employer"
