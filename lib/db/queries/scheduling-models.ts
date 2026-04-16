// Centralized exports for scheduling-related Mongoose models.
// Managers should import models from here (not from schema files directly).
import Award from "@/lib/db/schemas/award"
import { Employee } from "@/lib/db/schemas/employee"
import { EmployeeRoleAssignment } from "@/lib/db/schemas/employee-role-assignment"
import { Location } from "@/lib/db/schemas/location"
import { Roster } from "@/lib/db/schemas/roster"
import { Team } from "@/lib/db/schemas/team"
import { AvailabilityConstraint } from "@/lib/db/schemas/availability-constraint"

export const SchedulingModels = {
  Award,
  Employee,
  EmployeeRoleAssignment,
  Location,
  Roster,
  Team,
  AvailabilityConstraint,
}

