import { SchedulingTemplatesDbQueries, oid } from "@/lib/db/queries/scheduling-templates"

export const SchedulingRoleTemplatesDbQueries = {
  oid,
  rosterTemplate: SchedulingTemplatesDbQueries.rosterTemplate,
  async employeeFindById(id: string) {
    const { Employee } = await import("@/lib/db/schemas/employee")
    return Employee.findById(id)
  },
}

