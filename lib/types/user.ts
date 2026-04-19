import { z } from "zod"
import { 
  userCreateSchema, 
  userUpdateSchema, 
  userResponseSchema,
  usersListResponseSchema,
  userCreateResponseSchema,
  singleUserResponseSchema,
  userUpdateResponseSchema,
  userDeleteResponseSchema
} from "@/lib/validations/user"

// Inferred types from validation schemas - single source of truth
export type User = z.infer<typeof userResponseSchema>
export type CreateUserRequest = z.infer<typeof userCreateSchema>
export type UpdateUserRequest = z.infer<typeof userUpdateSchema>

// API response types
export type UsersListResponse = z.infer<typeof usersListResponseSchema>
export type UserCreateResponse = z.infer<typeof userCreateResponseSchema>
export type SingleUserResponse = z.infer<typeof singleUserResponseSchema>
export type UserUpdateResponse = z.infer<typeof userUpdateResponseSchema>
export type UserDeleteResponse = z.infer<typeof userDeleteResponseSchema>