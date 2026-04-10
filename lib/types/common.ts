import { z } from "zod"
import { 
  mongoIdSchema, 
  idParamSchema, 
  paginationSchema, 
  dateTimeSchema, 
  dateSchema, 
  apiErrorSchema, 
  successResponseSchema 
} from "@/lib/validations/common"

export type MongoId = z.infer<typeof mongoIdSchema>
export type IdParam = z.infer<typeof idParamSchema>
export type PaginationQuery = z.infer<typeof paginationSchema>
export type DateTime = z.infer<typeof dateTimeSchema>
export type DateString = z.infer<typeof dateSchema>
export type ApiError = z.infer<typeof apiErrorSchema>
export type SuccessResponse = z.infer<typeof successResponseSchema>