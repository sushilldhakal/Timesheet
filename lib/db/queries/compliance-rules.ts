import { ComplianceRule } from "@/lib/db/schemas/compliance-rule"

export const ComplianceRulesDbQueries = {
  find: (filter: Record<string, unknown>) => ComplianceRule.find(filter),
}

