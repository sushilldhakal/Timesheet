"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  ArrowLeft, Pencil, Mail, Phone,
  LayoutDashboard, DollarSign, ShieldCheck, FileText, Award, Clock,
} from "lucide-react"
import { OptimizedImage } from "@/components/ui/optimized-image"
import { EditEmployeeDialog } from "../EditEmployeeDialog"
import { EmployeeRoleAssignmentDialog } from "@/components/employees/employee-role-assignment-dialog"
import EmployeeRoleAssignmentList from "@/components/employees/employee-role-assignment-list"
import EmployeeAwardCard from "@/components/employees/employee-award-card"
import { useEmployee } from "@/lib/queries/employees"

import { OverviewTab } from "@/components/employees/profile-tabs/overview-tab"
import { PayrollTab } from "@/components/employees/profile-tabs/payroll-tab"
import { ComplianceTab } from "@/components/employees/profile-tabs/compliance-tab"
import { ContractTab } from "@/components/employees/profile-tabs/contract-tab"
import { DevelopmentTab } from "@/components/employees/profile-tabs/development-tab"
import { TimesheetTab } from "@/components/employees/profile-tabs/timesheet-tab"

function HeaderSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <Skeleton className="h-9 w-9 rounded-md" />
      <div className="flex items-center gap-3 flex-1">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-9 w-28" />
    </div>
  )
}

function EmployeeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const [activeTab, setActiveTab] = useState("overview")
  const [editEmployeeOpen, setEditEmployeeOpen] = useState(false)
  const [roleAssignmentDialogOpen, setRoleAssignmentDialogOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Allow deep-linking via URL hash (e.g. /employees/:id/#timesheet).
  useEffect(() => {
    if (!mounted) return
    const hash = typeof window !== "undefined" ? window.location.hash : ""
    const next = hash?.replace("#", "").trim()
    if (!next) return
    if (["overview", "timesheet", "payroll", "compliance", "contract", "development"].includes(next)) {
      setActiveTab(next)
    }
  }, [mounted])

  const employeeQuery = useEmployee(id)
  const loading = employeeQuery.isLoading
  const rawEmployee = employeeQuery.data?.employee

  const employee = rawEmployee
    ? {
        id: rawEmployee.id,
        name: rawEmployee.name ?? "",
        pin: rawEmployee.pin ?? "",
        roles: rawEmployee.roles ?? [],
        employers: rawEmployee.employers ?? [],
        locations: rawEmployee.locations ?? [],
        email: rawEmployee.email ?? "",
        phone: rawEmployee.phone ?? "",
        dob: rawEmployee.dob ?? "",
        homeAddress: rawEmployee.homeAddress ?? "",
        gender: rawEmployee.gender ?? "",
        comment: rawEmployee.comment ?? "",
        img: rawEmployee.img ?? "",
        award: rawEmployee.award ?? undefined,
        employmentType: rawEmployee.employmentType ?? undefined,
        standardHoursPerWeek: rawEmployee.standardHoursPerWeek ?? undefined,
        // New payroll/compliance fields (may not be returned by existing API yet)
        legalFirstName: (rawEmployee as any).legalFirstName,
        legalMiddleNames: (rawEmployee as any).legalMiddleNames,
        legalLastName: (rawEmployee as any).legalLastName,
        preferredName: (rawEmployee as any).preferredName,
        timeZone: (rawEmployee as any).timeZone,
        locale: (rawEmployee as any).locale,
        nationality: (rawEmployee as any).nationality,
        isActive: (rawEmployee as any).isActive ?? true,
        isProbationary: (rawEmployee as any).isProbationary ?? false,
        probationEndDate: (rawEmployee as any).probationEndDate,
        terminatedAt: (rawEmployee as any).terminatedAt,
        terminationReason: (rawEmployee as any).terminationReason,
        skills: (rawEmployee as any).skills,
        certifications: (rawEmployee as any).certifications,
        createdAt: rawEmployee.createdAt,
        updatedAt: rawEmployee.updatedAt,
      }
    : null

  const refetchEmployee = () => employeeQuery.refetch()

  // Avoid hydration mismatch when the client has a warm React Query cache
  // but the server render shows the loading skeleton.
  if (!mounted) {
    return (
      <div className="flex flex-col space-y-6 p-4 lg:p-8">
        <HeaderSkeleton />
        <Skeleton className="h-10 w-full max-w-lg" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col space-y-6 p-4 lg:p-8">
        <HeaderSkeleton />
        <Skeleton className="h-10 w-full max-w-lg" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
        <p className="text-muted-foreground">Employee not found</p>
        <Button onClick={() => router.push("/dashboard/employees")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Employees
        </Button>
      </div>
    )
  }

  const isActive = employee.isActive !== false && !employee.terminatedAt

  return (
    <div className="flex flex-col space-y-6 p-4 lg:p-8">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/employees")}
          className="shrink-0 self-start"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <OptimizedImage
            src={employee.img}
            alt={employee.name}
            width={48}
            height={48}
            className="rounded-full object-cover w-12 h-12 shrink-0"
            fallbackName={employee.name}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold truncate">{employee.name}</h1>
              {isActive ? (
                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                  Active
                </Badge>
              ) : (
                <Badge variant="destructive">
                  {employee.terminatedAt ? "Terminated" : "Inactive"}
                </Badge>
              )}
              {employee.isProbationary && (
                <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                  Probation
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-sm text-muted-foreground flex-wrap">
              <span>PIN: {employee.pin}</span>
              {employee.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {employee.email}
                </span>
              )}
              {employee.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {employee.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        <Button onClick={() => setEditEmployeeOpen(true)} className="shrink-0 self-start sm:self-center">
          <Pencil className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      {/* ─── Tab Navigation ─────────────────────────────────── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v)
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href)
            url.hash = v === "overview" ? "" : v
            window.history.replaceState(null, "", url.toString())
          }
        }}
      >
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="timesheet" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Timesheet
          </TabsTrigger>
          <TabsTrigger value="payroll" className="gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            Payroll
          </TabsTrigger>
          <TabsTrigger value="compliance" className="gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="contract" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Contract
          </TabsTrigger>
          <TabsTrigger value="development" className="gap-1.5">
            <Award className="h-3.5 w-3.5" />
            Development
          </TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview">
          <div className="space-y-6 pt-2">
            <OverviewTab employee={employee} onNavigate={setActiveTab} />

            {/* Existing role assignments & award cards */}
            <div className="grid gap-6 lg:grid-cols-2">
              <EmployeeRoleAssignmentList
                employeeId={employee.id}
                onAdd={() => setRoleAssignmentDialogOpen(true)}
              />
              <EmployeeAwardCard
                employeeId={employee.id}
                currentAwardId={employee.award?.id ?? null}
                currentAwardLevel={employee.award?.level ?? null}
                currentEmploymentType={employee.employmentType ?? null}
                onUpdate={refetchEmployee}
              />
            </div>
          </div>
        </TabsContent>

        {/* ── Timesheet ── */}
        <TabsContent value="timesheet">
          <TimesheetTab employeeId={employee.id} employeeName={employee.name} employeeImage={employee.img} />
        </TabsContent>

        {/* ── Payroll ── */}
        <TabsContent value="payroll">
          <div className="pt-2">
            <PayrollTab employeeId={employee.id} />
          </div>
        </TabsContent>

        {/* ── Compliance ── */}
        <TabsContent value="compliance">
          <div className="pt-2">
            <ComplianceTab employeeId={employee.id} canEditPayroll />
          </div>
        </TabsContent>

        {/* ── Contract ── */}
        <TabsContent value="contract">
          <div className="pt-2">
            <ContractTab employeeId={employee.id} canEditPayroll />
          </div>
        </TabsContent>

        {/* ── Development (Qualifications) ── */}
        <TabsContent value="development">
          <div className="pt-2">
            <DevelopmentTab employeeId={employee.id} canEditPayroll />
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Dialogs ────────────────────────────────────────── */}
      <EditEmployeeDialog
        employee={employee}
        open={editEmployeeOpen}
        onOpenChange={setEditEmployeeOpen}
        onSuccess={refetchEmployee}
      />

      <EmployeeRoleAssignmentDialog
        employeeId={employee.id}
        employeeName={employee.name}
        open={roleAssignmentDialogOpen}
        onOpenChange={setRoleAssignmentDialogOpen}
        onSuccess={refetchEmployee}
      />
    </div>
  )
}

export default EmployeeDetailPage
