import { connectDB, DailyShift, Employee } from "@/lib/db"
import { getEmployeeFromCookie } from "@/lib/auth/auth-helpers"
import { employeeMeResponseSchema } from "@/lib/validations/employee-clock"
import { errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import { EmployeeRoleAssignment } from "@/lib/db/schemas/employee-role-assignment"
import { cookies } from "next/headers"
import Award from "@/lib/db/schemas/award"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employee/me',
  summary: 'Get current employee',
  description: 'Get current authenticated employee information',
  tags: ['Clock'],
  security: 'employeeAuth',
  responses: {
    200: employeeMeResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async (data) => {
    try {
      const cookieStore = await cookies()
      const employeeAuth = await getEmployeeFromCookie()

      if (!employeeAuth) {
        return {
          status: 401,
          data: { error: "Not authenticated" }
        };
      }

      await connectDB();

      const employee = await Employee.findById(employeeAuth.sub).lean()

      if (!employee) {
        return {
          status: 404,
          data: { error: "Employee not found" }
        };
      }

      // Get active role assignments for this employee
      const roleAssignments = await EmployeeRoleAssignment.find({
        employeeId: employeeAuth.sub,
        isActive: true,
      })
        .populate("roleId", "name")
        .populate("locationId", "name")
        .lean();

      const locations = Array.isArray(employee.location) ? employee.location : [];
      const employers = Array.isArray(employee.employer) ? employee.employer : [];
      
      // Get role names from role assignments
      const roleNames = roleAssignments.map(ra => (ra.roleId as any)?.name).filter(Boolean);
      const locationNames = roleAssignments.map(ra => (ra.locationId as any)?.name).filter(Boolean);

      // Fetch award name if assigned
      let award: { id: string; name: string; level: string } | null = null
      const awardId = (employee as any).awardId
      const awardLevel = (employee as any).awardLevel
      if (awardId) {
        const awardDoc = await Award.findById(awardId).select("_id name").lean()
        if (awardDoc && !Array.isArray(awardDoc)) {
          award = {
            id: String((awardDoc as any)._id),
            name: String((awardDoc as any).name || ""),
            level: String(awardLevel || ""),
          }
        }
      }

      // If no profile image is uploaded, fall back to latest clock-in image (same as admin employee page)
      let lastClockInImage: string = ""
      if (!employee.img) {
        const lastShiftWithClockInPhoto = await DailyShift.findOne({
          pin: employee.pin,
          "clockIn.image": { $exists: true, $ne: "" },
        })
          .sort({ date: -1 })
          .select({ "clockIn.image": 1 })
          .lean()

        lastClockInImage = (lastShiftWithClockInPhoto as any)?.clockIn?.image ?? ""
      }

      const responseData = {
        pin: employee.pin,
        id: String(employee._id),
        name: employee.name || "Not provided",
        location: locationNames[0] || locations[0] || "Not assigned",
        employer: employers[0] || "Not assigned", 
        role: roleNames[0] || "Staff",
        email: employee.email && employee.email.trim() ? employee.email : "",
        phone: employee.phone && employee.phone.trim() ? employee.phone : "",
        homeAddress: employee.homeAddress && employee.homeAddress.trim() ? employee.homeAddress : "",
        employmentType: employee.employmentType && employee.employmentType.trim() ? employee.employmentType : "",
        img: employee.img || "",
        dob: employee.dob && String(employee.dob).trim() ? String(employee.dob) : "",
        comment: employee.comment && String(employee.comment).trim() ? String(employee.comment) : "",
        standardHoursPerWeek: typeof (employee as any).standardHoursPerWeek === "number" ? (employee as any).standardHoursPerWeek : null,
        award,
        lastClockInImage,
        isBirthday: false, // TODO: Calculate based on DOB
      };

      return {
        status: 200,
        data: {
          employee: responseData,
        }
      };
    } catch (err) {
      console.error("[api/employee/me]", err);
      return {
        status: 500,
        data: { error: "Failed to fetch employee" }
      };
    }
  }
});
