import { z } from "zod"
import { 
  userCreateSchema, 
  userAdminUpdateSchema, 
  userSelfUpdateSchema, 
  userIdParamSchema, 
  adminCreateSchema 
} from "@/lib/validations/user"

export type UserCreateRequest = z.infer<typeof userCreateSchema>
export type UserAdminUpdateRequest = z.infer<typeof userAdminUpdateSchema>
export type UserSelfUpdateRequest = z.infer<typeof userSelfUpdateSchema>
export type UserIdParam = z.infer<typeof userIdParamSchema>
export type AdminLoginRequest = z.infer<typeof adminCreateSchema>