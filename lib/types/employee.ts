import { z } from "zod"
import { 
  employeeCreateSchema, 
  employeeUpdateSchema 
} from "@/lib/validations/employee"

export type EmployeeCreateRequest = z.infer<typeof employeeCreateSchema>
export type EmployeeUpdateRequest = z.infer<typeof employeeUpdateSchema>