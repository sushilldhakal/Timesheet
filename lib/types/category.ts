import { z } from "zod"
import { 
  categoryCreateSchema 
} from "@/lib/validations/category"

export type CategoryCreateRequest = z.infer<typeof categoryCreateSchema>