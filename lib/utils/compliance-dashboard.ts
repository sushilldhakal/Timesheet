import { differenceInDays } from 'date-fns'
import type { Employee } from '@/lib/api/employees'
import type { EmployeeComplianceRecord } from '@/lib/api/employees'

export interface ComplianceStats {
  totalEmployees: number
  fullyCurrent: number
  warningCount: number
  criticalCount: number
  expiringPercentage: number
}

export interface ComplianceBreakdown {
  wwc: { compliant: number; warning: number; critical: number }
  policeClearance: { compliant: number; warning: number; critical: number }
  foodHandling: { compliant: number; warning: number; critical: number }
  induction: { completed: number; pending: number }
  codeOfConduct: { signed: number; pending: number }
}

export interface ComplianceIssue {
  employeeId: string
  employeeName: string
  issueType: string
  severity: 'critical' | 'warning' | 'info'
  description: string
  expiryDate?: string
  daysUntilExpiry?: number
}

function checkExpiry(status: string | null | undefined, expiryDate: string | null | undefined): 'critical' | 'warning' | 'ok' {
  if (status === 'expired' || status === 'pending') return 'critical'
  if (expiryDate) {
    const daysLeft = differenceInDays(new Date(expiryDate), new Date())
    if (daysLeft < 0) return 'critical'
    if (daysLeft < 30) return 'warning'
  }
  return 'ok'
}

export function calculateComplianceStats(
  employees: Employee[],
  complianceData: EmployeeComplianceRecord[]
): ComplianceStats {
  const totalEmployees = employees.length
  let fullyCurrent = 0
  let warningCount = 0
  let criticalCount = 0

  employees.forEach((employee) => {
    const compliance = complianceData.find((c) => c.employeeId === employee.id)
    if (!compliance) {
      criticalCount++
      return
    }

    const checks = [
      checkExpiry(compliance.wwcStatus, compliance.wwcExpiryDate),
      checkExpiry(compliance.policeClearanceStatus, compliance.policeClearanceExpiryDate),
      checkExpiry(compliance.foodHandlingStatus, compliance.foodHandlingExpiryDate),
    ]

    if (checks.includes('critical')) criticalCount++
    else if (checks.includes('warning')) warningCount++
    else fullyCurrent++
  })

  return {
    totalEmployees,
    fullyCurrent,
    warningCount,
    criticalCount,
    expiringPercentage: totalEmployees > 0 ? Math.round(((warningCount + criticalCount) / totalEmployees) * 100) : 0,
  }
}

export function getComplianceBreakdown(complianceData: EmployeeComplianceRecord[]): ComplianceBreakdown {
  const wwc = { compliant: 0, warning: 0, critical: 0 }
  const policeClearance = { compliant: 0, warning: 0, critical: 0 }
  const foodHandling = { compliant: 0, warning: 0, critical: 0 }
  const induction = { completed: 0, pending: 0 }
  const codeOfConduct = { signed: 0, pending: 0 }

  complianceData.forEach((c) => {
    const wwcResult = checkExpiry(c.wwcStatus, c.wwcExpiryDate)
    if (wwcResult === 'critical') wwc.critical++
    else if (wwcResult === 'warning') wwc.warning++
    else wwc.compliant++

    const pcResult = checkExpiry(c.policeClearanceStatus, c.policeClearanceExpiryDate)
    if (pcResult === 'critical') policeClearance.critical++
    else if (pcResult === 'warning') policeClearance.warning++
    else policeClearance.compliant++

    const fhResult = checkExpiry(c.foodHandlingStatus, c.foodHandlingExpiryDate)
    if (fhResult === 'critical') foodHandling.critical++
    else if (fhResult === 'warning') foodHandling.warning++
    else foodHandling.compliant++

    if (c.inductionCompleted) induction.completed++
    else induction.pending++

    if (c.codeOfConductSigned) codeOfConduct.signed++
    else codeOfConduct.pending++
  })

  return { wwc, policeClearance, foodHandling, induction, codeOfConduct }
}

export function getComplianceIssues(employees: Employee[], complianceData: EmployeeComplianceRecord[]): ComplianceIssue[] {
  const issues: ComplianceIssue[] = []

  const addIssue = (employee: Employee, type: string, status: string | null | undefined, expiryDate: string | null | undefined) => {
    if (status === 'expired') {
      issues.push({ employeeId: employee.id, employeeName: employee.name, issueType: type, severity: 'critical', description: `${type} has expired`, expiryDate: expiryDate ?? undefined })
    } else if (status === 'pending') {
      issues.push({ employeeId: employee.id, employeeName: employee.name, issueType: type, severity: 'critical', description: `${type} pending` })
    } else if (expiryDate) {
      const daysLeft = differenceInDays(new Date(expiryDate), new Date())
      if (daysLeft < 0) {
        issues.push({ employeeId: employee.id, employeeName: employee.name, issueType: type, severity: 'critical', description: `${type} has expired`, expiryDate, daysUntilExpiry: daysLeft })
      } else if (daysLeft < 30) {
        issues.push({ employeeId: employee.id, employeeName: employee.name, issueType: type, severity: 'warning', description: `${type} expiring in ${daysLeft} days`, expiryDate, daysUntilExpiry: daysLeft })
      }
    }
  }

  employees.forEach((employee) => {
    const compliance = complianceData.find((c) => c.employeeId === employee.id)
    if (!compliance) return

    addIssue(employee, 'WWC', compliance.wwcStatus, compliance.wwcExpiryDate)
    addIssue(employee, 'Police Clearance', compliance.policeClearanceStatus, compliance.policeClearanceExpiryDate)
    addIssue(employee, 'Food Handling', compliance.foodHandlingStatus, compliance.foodHandlingExpiryDate)
  })

  return issues.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1
    if (a.daysUntilExpiry != null && b.daysUntilExpiry != null) return a.daysUntilExpiry - b.daysUntilExpiry
    return 0
  })
}

export function generateComplianceReport(
  stats: ComplianceStats,
  breakdown: ComplianceBreakdown,
  issues: ComplianceIssue[]
): string {
  const now = new Date().toLocaleDateString()
  const pct = (n: number) => stats.totalEmployees > 0 ? Math.round((n / stats.totalEmployees) * 100) : 0

  return `COMPLIANCE REPORT
Generated: ${now}

EXECUTIVE SUMMARY
================
Total Employees: ${stats.totalEmployees}
Fully Compliant: ${stats.fullyCurrent} (${pct(stats.fullyCurrent)}%)
Warning (Expiring Soon): ${stats.warningCount} (${pct(stats.warningCount)}%)
Critical Issues: ${stats.criticalCount} (${pct(stats.criticalCount)}%)

COMPLIANCE BREAKDOWN
====================
Working With Children Check (WWC):
  - Compliant: ${breakdown.wwc.compliant}
  - Warning: ${breakdown.wwc.warning}
  - Critical: ${breakdown.wwc.critical}

Police Clearance:
  - Compliant: ${breakdown.policeClearance.compliant}
  - Warning: ${breakdown.policeClearance.warning}
  - Critical: ${breakdown.policeClearance.critical}

Food Handling Certification:
  - Compliant: ${breakdown.foodHandling.compliant}
  - Warning: ${breakdown.foodHandling.warning}
  - Critical: ${breakdown.foodHandling.critical}

Induction Completion:
  - Completed: ${breakdown.induction.completed}
  - Pending: ${breakdown.induction.pending}

Code of Conduct:
  - Signed: ${breakdown.codeOfConduct.signed}
  - Pending: ${breakdown.codeOfConduct.pending}

CRITICAL ISSUES (${issues.filter((i) => i.severity === 'critical').length})
==========================
${issues.filter((i) => i.severity === 'critical').map((issue) => `- ${issue.employeeName}: ${issue.description} (${issue.issueType})`).join('\n')}

WARNINGS (${issues.filter((i) => i.severity === 'warning').length})
==========
${issues.filter((i) => i.severity === 'warning').map((issue) => `- ${issue.employeeName}: ${issue.description} (${issue.issueType})`).join('\n')}
`
}
