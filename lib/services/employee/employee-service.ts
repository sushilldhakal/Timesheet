import { apiErrors } from "@/lib/api/api-error"
import { type AuthWithLocations, SUPER_ADMIN_SENTINEL } from "@/lib/auth/auth-api"
import { MongoEmployeeRepository } from "@/infrastructure/db/mongo/MongoEmployeeRepository"
import type { IEmployeeRepository } from "@/contracts/repositories/IEmployeeRepository"
import type { EmployeeCreatePersistInput } from "@/contracts/dtos/employee"
import { checkEmailExists } from "@/lib/utils/validation/email-validator"
import { generateTokenWithExpiry } from "@/lib/utils/auth/auth-tokens"
import { sendEmail } from "@/lib/mail/sendEmail"
import { generateOnboardingEmail } from "@/lib/mail/templates/employee-onboarding"
import { generateOnboardingWithPasswordEmail } from "@/lib/mail/templates/employee-onboarding-with-password"
import { generateOnboardingSetupLinkEmail } from "@/lib/mail/templates/employee-onboarding-setup-link"
import { syncEmployeePhotoFromPunches } from "@/lib/utils/employees/employee-photo-sync"
import { connectDB } from "@/lib/db"
import { RoleAssignmentManager } from "@/lib/managers/role-assignment-manager"

const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : v != null && v !== "" ? [String(v).trim()] : []

/** Map seed/legacy values to the same strings as staff `<select>` options */
function genderForUi(raw: unknown): string {
  if (raw == null) return ""
  const s = String(raw).trim()
  if (!s) return ""
  const k = s.toLowerCase()
  if (k === "male" || k === "m") return "Male"
  if (k === "female" || k === "f") return "Female"
  if (k === "other") return "Other"
  if (k === "prefer not to say" || k === "prefer_not_to_say") return "Prefer not to say"
  return s
}

function buildLocationTeamPairs(body: Record<string, unknown>): Array<{ location: string; team: string }> {
  const lt = body.locationTeamAssignments
  if (Array.isArray(lt) && lt.length > 0) {
    return lt
      .filter((a: unknown) => a && typeof a === "object" && "location" in (a as object) && "team" in (a as object))
      .map((a: any) => ({ location: String(a.location).trim(), team: String(a.team).trim() }))
      .filter((a) => a.location && a.team)
  }
  const locs = arr(body.location)
  const teams = arr(body.team)
  if (locs.length === 1 && teams.length > 0) {
    return teams.map((t) => ({ location: locs[0], team: t }))
  }
  return []
}

export class EmployeeService {
  private repo: IEmployeeRepository

  constructor(repo: IEmployeeRepository = new MongoEmployeeRepository()) {
    this.repo = repo
  }

  async listEmployees(ctx: AuthWithLocations, query: any) {
    const res = await this.repo.listEmployees(
      { tenantId: ctx.tenantId },
      { ...(query ?? {}), userLocations: ctx.userLocations, managedRoles: ctx.managedRoles }
    )
    for (const e of res.employees) {
      if (!e.img || e.img === "") {
        void syncEmployeePhotoFromPunches(e.pin).catch(() => {})
      }
    }
    return res
  }

  async createEmployee(ctx: AuthWithLocations, body: any) {
    if (!body) throw apiErrors.badRequest("Request body is required")

    if (ctx.tenantId === SUPER_ADMIN_SENTINEL) {
      throw apiErrors.badRequest("Super admin must specify a tenantId when creating employees")
    }

    if (body.email) {
      const emailCheck = await checkEmailExists(body.email)
      if (emailCheck.exists) throw apiErrors.conflict("Email already in use")
    }

    const pinInUse = await this.repo.pinExistsForTenant({ tenantId: ctx.tenantId }, String(body.pin).trim())
    if (pinInUse) throw apiErrors.conflict("PIN already in use")

    const firstLocName = Array.isArray(body.location) && body.location.length > 0 ? String(body.location[0]).trim() : undefined
    const onboardingCountry = await this.repo.resolveOnboardingCountryForLocationName({ tenantId: ctx.tenantId }, firstLocName)

    let passwordSetupToken: string | undefined
    let passwordSetupExpiry: Date | undefined
    let setupTokenPlain: string | undefined
    if (!body.password && body.sendSetupEmail && body.email) {
      const tokenData = generateTokenWithExpiry(24)
      setupTokenPlain = tokenData.token
      passwordSetupToken = tokenData.hashedToken
      passwordSetupExpiry = tokenData.expiry
    }

    const persist: EmployeeCreatePersistInput = {
      name: String(body.name).trim(),
      pin: String(body.pin).trim(),
      employer: arr(body.employer),
      location: arr(body.location),
      email: body.email != null ? String(body.email).trim() : "",
      phone: body.phone != null ? String(body.phone).trim() : "",
      homeAddress: body.homeAddress != null ? String(body.homeAddress).trim() : "",
      dob: body.dob != null ? String(body.dob) : "",
      gender: genderForUi(body.gender),
      comment: body.comment != null ? String(body.comment).trim() : "",
      img: (body.profileImage ?? body.img ?? "") != null ? String(body.profileImage ?? body.img ?? "").trim() : "",
      employmentType: body.employmentType ?? null,
      standardHoursPerWeek: body.standardHoursPerWeek ?? null,
      awardId: body.awardId ? String(body.awardId) : null,
      awardLevel: body.awardLevel != null ? String(body.awardLevel) : null,
      certifications:
        body.certifications?.map((cert: any) => ({
          type: String(cert.type),
          label: cert.label != null ? String(cert.label) : undefined,
          required: !!cert.required,
          provided: false,
        })) ?? [],
      onboardingWorkflowStatus: "not_started",
      onboardingCountry,
      onboardingInvitedBy: ctx.auth.sub,
    }

    if (body.password) {
      persist.password = body.password
      persist.passwordSetByAdmin = true
      persist.requirePasswordChange = true
    } else if (passwordSetupToken && passwordSetupExpiry) {
      persist.passwordSetupToken = passwordSetupToken
      persist.passwordSetupExpiry = passwordSetupExpiry
    }

    const result = await this.repo.createEmployee({ tenantId: ctx.tenantId }, persist)

    const pairs = buildLocationTeamPairs(body)
    if (pairs.length > 0) {
      await connectDB()
      const { Location, Team } = await import("@/lib/db")
      const manager = new RoleAssignmentManager()
      for (const { location: locName, team: teamName } of pairs) {
        const loc = await Location.findOne({ tenantId: ctx.tenantId, name: locName }).select("_id").lean()
        const teamDoc = await Team.findOne({ tenantId: ctx.tenantId, name: teamName }).select("_id").lean()
        if (!loc || !teamDoc) continue
        try {
          await manager.assignRole({
            employeeId: result.employee.id,
            teamId: String((teamDoc as any)._id),
            locationId: String((loc as any)._id),
            validFrom: new Date(),
            validTo: null,
            userId: ctx.auth.sub,
          })
        } catch (err) {
          console.error("[createEmployee] role assignment failed:", err)
        }
      }
    }

    if (result.employee.email) {
      try {
        let emailContent: { html: string; plain: string }
        if (body.password) {
          emailContent = generateOnboardingWithPasswordEmail({
            name: result.employee.name,
            pin: result.employee.pin,
            email: result.employee.email,
            phone: result.employee.phone || "Not provided",
          })
        } else if (body.sendSetupEmail && setupTokenPlain) {
          const setupUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/setup-password?token=${setupTokenPlain}`
          emailContent = generateOnboardingSetupLinkEmail({
            name: result.employee.name,
            pin: result.employee.pin,
            email: result.employee.email,
            phone: result.employee.phone || "Not provided",
            setupUrl,
          })
        } else {
          emailContent = generateOnboardingEmail({
            name: result.employee.name,
            pin: result.employee.pin,
            email: result.employee.email,
            phone: result.employee.phone || "Not provided",
          })
        }

        await sendEmail({
          to: result.employee.email,
          subject: "Welcome to Timesheet - Your Account Details",
          html: emailContent.html,
          plain: emailContent.plain,
          orgId: ctx.tenantId,
        })
      } catch {
        /* ignore */
      }
    }

    return result
  }

  async getEmployeeDetail(ctx: AuthWithLocations, id: string) {
    return this.repo.getEmployeeDetail({ tenantId: ctx.tenantId }, id)
  }

  async updateEmployee(ctx: AuthWithLocations, id: string, body: any) {
    return this.repo.updateEmployee({ tenantId: ctx.tenantId }, id, body)
  }

  async deleteEmployee(ctx: AuthWithLocations, id: string) {
    return this.repo.deleteEmployee({ tenantId: ctx.tenantId }, id)
  }
}

export const employeeService = new EmployeeService()
