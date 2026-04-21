import { connectDB } from "@/lib/db";
import { createEmployeeToken, setEmployeeCookie } from "@/lib/auth/auth-helpers";
import { isWithinGeofence } from "@/lib/utils/validation/geofence";
import { EmployeeAuthDbQueries } from "@/lib/db/queries/employee-auth";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";

function checkIfBirthday(dob?: string): boolean {
  if (!dob || typeof dob !== "string" || !dob.trim()) return false;
  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();
  const dobStr = dob.trim();
  let month: number | null = null;
  let day: number | null = null;
  const isoMatch = dobStr.match(/^\d{4}-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    month = parseInt(isoMatch[1], 10);
    day = parseInt(isoMatch[2], 10);
  }
  const ddmmyyyyMatch = dobStr.match(/^(\d{1,2})-(\d{1,2})-\d{4}$/);
  if (ddmmyyyyMatch) {
    day = parseInt(ddmmyyyyMatch[1], 10);
    month = parseInt(ddmmyyyyMatch[2], 10);
  }
  const mmddyyyyMatch = dobStr.match(/^(\d{1,2})\/(\d{1,2})\/\d{4}$/);
  if (mmddyyyyMatch) {
    month = parseInt(mmddyyyyMatch[1], 10);
    day = parseInt(mmddyyyyMatch[2], 10);
  }
  if (month === null || day === null) return false;
  return month === todayMonth && day === todayDay;
}

export class EmployeeAuthService {
  async pinLogin(body: any) {
    const { pin, lat: userLat, lng: userLng } = body;
    const pinStr = pin.trim();

    await connectDB();
    const employee = await EmployeeAuthDbQueries.findEmployeeByPinLean(pinStr);
    if (!employee) return { status: 401, data: { error: "Invalid PIN" } };

    const arr = (v: unknown) => (Array.isArray(v) ? v : v ? [String(v)] : []);
    const locations = arr((employee as any).location);
    const employers = arr((employee as any).employer);

    const roleAssignments = await EmployeeAuthDbQueries.listRoleAssignmentsWithRoleLean((employee as any)._id);
    const roles = (roleAssignments as any[]).map((a) => a.roleId?.name).filter(Boolean);

    let geofenceWarning = false;
    let detectedLocation: string | null = null;

    if (locations.length > 0 && userLat !== undefined && userLng !== undefined) {
      const locationCategories = await EmployeeAuthDbQueries.listLocationsForGeofenceLean(locations);

      if ((locationCategories as any[]).length > 0) {
        const withinAnyGeofence = (locationCategories as any[]).some((lc) => {
          const radius = lc.radius ?? 100;
          const isWithin = isWithinGeofence(userLat, userLng, lc.lat!, lc.lng!, radius);
          if (isWithin && !detectedLocation) detectedLocation = lc.name;
          return isWithin;
        });

        if (!withinAnyGeofence) {
          const hasHardMode = (locationCategories as any[]).some((loc) => (loc.geofenceMode ?? "hard") === "hard");
          if (hasHardMode) {
            return {
              status: 403,
              data: { error: "You are outside the allowed location range. Please move closer to clock in or contact IT support." },
            };
          }
          geofenceWarning = true;
        }
      }
    }

    const token = await createEmployeeToken({ sub: String((employee as any)._id), pin: pinStr });
    await setEmployeeCookie(token);

    const displayRole = roles[0] || locations[0] || employers[0] || "";
    const isBirthday = checkIfBirthday((employee as any).dob);

    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
    const shift = await EmployeeAuthDbQueries.findShiftForDateLean((employee as any).pin, todayStart);
    const punches = {
      clockIn: (shift as any)?.clockIn?.time ? format(new Date((shift as any).clockIn.time), "h:mm:ss a", { locale: enUS }) : "",
      breakIn: (shift as any)?.breakIn?.time ? format(new Date((shift as any).breakIn.time), "h:mm:ss a", { locale: enUS }) : "",
      breakOut: (shift as any)?.breakOut?.time ? format(new Date((shift as any).breakOut.time), "h:mm:ss a", { locale: enUS }) : "",
      clockOut: (shift as any)?.clockOut?.time ? format(new Date((shift as any).clockOut.time), "h:mm:ss a", { locale: enUS }) : "",
    };

    return {
      status: 200,
      data: {
        employee: {
          id: String((employee as any)._id),
          name: (employee as any).name,
          pin: (employee as any).pin,
          role: displayRole,
          location: locations[0] || "",
        },
        punches,
        geofenceWarning,
        isBirthday,
        detectedLocation,
      },
    };
  }

  async me(employeeId: string) {
    await connectDB();
    const employee = await EmployeeAuthDbQueries.findEmployeeByIdLean(employeeId);
    if (!employee) return { status: 404, data: { error: "Employee not found" } };

    const roleAssignments = await EmployeeAuthDbQueries.listRoleAssignmentsWithRoleAndLocationLean(employeeId);

    const locations = Array.isArray((employee as any).location) ? (employee as any).location : [];
    const employers = Array.isArray((employee as any).employer) ? (employee as any).employer : [];
    const roleNames = (roleAssignments as any[]).map((ra) => (ra.roleId as any)?.name).filter(Boolean);
    const locationNames = (roleAssignments as any[]).map((ra) => (ra.locationId as any)?.name).filter(Boolean);

    let award: { id: string; name: string; level: string } | null = null;
    const awardId = (employee as any).awardId;
    const awardLevel = (employee as any).awardLevel;
    if (awardId) {
      const awardDoc = await EmployeeAuthDbQueries.findAwardNameLean(awardId);
      if (awardDoc && !Array.isArray(awardDoc)) {
        award = { id: String((awardDoc as any)._id), name: String((awardDoc as any).name || ""), level: String(awardLevel || "") };
      }
    }

    let lastClockInImage = "";
    if (!(employee as any).img) {
      const lastShiftWithClockInPhoto = await EmployeeAuthDbQueries.findMostRecentShiftWithClockInImageLean((employee as any).pin);
      lastClockInImage = (lastShiftWithClockInPhoto as any)?.clockIn?.image ?? "";
    }

    return {
      status: 200,
      data: {
        employee: {
          pin: (employee as any).pin,
          id: String((employee as any)._id),
          name: (employee as any).name || "Not provided",
          location: locationNames[0] || locations[0] || "Not assigned",
          employer: employers[0] || "Not assigned",
          role: roleNames[0] || "Staff",
          email: (employee as any).email && (employee as any).email.trim() ? (employee as any).email : "",
          phone: (employee as any).phone && (employee as any).phone.trim() ? (employee as any).phone : "",
          homeAddress: (employee as any).homeAddress && (employee as any).homeAddress.trim() ? (employee as any).homeAddress : "",
          employmentType: (employee as any).employmentType && (employee as any).employmentType.trim() ? (employee as any).employmentType : "",
          img: (employee as any).img || "",
          dob: (employee as any).dob && String((employee as any).dob).trim() ? String((employee as any).dob) : "",
          comment: (employee as any).comment && String((employee as any).comment).trim() ? String((employee as any).comment) : "",
          standardHoursPerWeek: typeof (employee as any).standardHoursPerWeek === "number" ? (employee as any).standardHoursPerWeek : null,
          award,
          lastClockInImage,
          onboardingCompleted: (employee as any).onboardingCompleted === true,
          onboardingCompletedAt: (employee as any).onboardingCompletedAt ? new Date((employee as any).onboardingCompletedAt).toISOString() : null,
          timeZone: (employee as any).timeZone || "Australia/Melbourne",
          nationality: (employee as any).nationality || "",
          legalFirstName: (employee as any).legalFirstName || "",
          legalMiddleNames: (employee as any).legalMiddleNames || "",
          legalLastName: (employee as any).legalLastName || "",
          preferredName: (employee as any).preferredName || "",
          address: (employee as any).address || null,
          emergencyContact: (employee as any).emergencyContact || null,
          isBirthday: false,
        },
      },
    };
  }

  async changePassword(employeeId: string, body: any) {
    const { currentPassword, newPassword } = body;
    await connectDB();
    const employee = await EmployeeAuthDbQueries.findEmployeeByIdWithPassword(employeeId);
    if (!employee) return { status: 404, data: { error: "Employee not found" } };

    if ((employee as any).password) {
      const ok = await (employee as any).comparePassword(currentPassword);
      if (!ok) return { status: 400, data: { error: "Current password is incorrect" } };
    }

    (employee as any).password = newPassword;
    (employee as any).requirePasswordChange = false;
    (employee as any).passwordSetByAdmin = false;
    (employee as any).passwordChangedAt = new Date();
    await (employee as any).save();

    return { status: 200, data: { message: "Password changed successfully" } };
  }
}

export const employeeAuthService = new EmployeeAuthService();
