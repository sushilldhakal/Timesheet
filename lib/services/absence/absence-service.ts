import { AbsencesDbQueries } from '@/lib/db/queries/absences';
import { connectDB } from '@/lib/db';
import { SUPER_ADMIN_SENTINEL } from '@/lib/auth/auth-api';
import { isObjectIdLike } from '@/shared/ids';

type PopulatedEmployeeRef = { _id: { toString(): string }; name?: unknown; pin?: unknown };
function isPopulatedEmployeeRef(v: unknown): v is PopulatedEmployeeRef {
  if (!v || typeof v !== 'object') return false;
  if (isObjectIdLike(v)) return false;
  return '_id' in v && isObjectIdLike((v as any)._id);
}

export class AbsenceService {
  async listBulk(query: any, tenantId?: string) {
    await connectDB();
    const { startDate, endDate, employeeId: employeeIds = [], location, status, leaveType, limit, offset } = query;

    const { EmployeeTeamAssignment, Location } = await import('@/lib/db');

    // Tenant scope for DB queries (super admin sees all)
    const tenantFilter = tenantId && tenantId !== SUPER_ADMIN_SENTINEL ? { tenantId } : {};

    // Resolve location names → employee IDs (union across all selected locations)
    let resolvedEmployeeIds: string[] = employeeIds;
    if (location) {
      const locationNames: string[] = Array.isArray(location) ? location : [location];
      const locationDocs = await Location.find({ ...tenantFilter, name: { $in: locationNames } }).select('_id').lean();
      const locationIds = (locationDocs as any[]).map((l) => l._id);

      if (locationIds.length === 0) {
        return { absences: [], total: 0 };
      }

      // Union: all employees assigned to ANY of the selected locations
      const assignments = await EmployeeTeamAssignment.find({
        ...tenantFilter,
        locationId: { $in: locationIds },
        isActive: true,
      }).distinct('employeeId');

      const locationEmployeeIds = assignments.map((id: any) => id.toString());

      // Intersect with manually specified employeeIds if any
      resolvedEmployeeIds = employeeIds.length > 0
        ? employeeIds.filter((id: string) => locationEmployeeIds.includes(id))
        : locationEmployeeIds;
    }

    const filter = AbsencesDbQueries.buildFilter({ startDate, endDate, employeeIds: resolvedEmployeeIds, status, leaveType });

    const [total, docs] = await Promise.all([
      AbsencesDbQueries.count(filter),
      AbsencesDbQueries.listLean({ filter, limit, offset }),
    ]);

    // Build a map of employeeId → [{ teamName, locationName }] for enriching the response
    const employeeOids = (docs as any[]).map((doc) => {
      const emp = doc.employeeId as any;
      if (isPopulatedEmployeeRef(emp)) return (emp as { _id: { toString(): string } })._id;
      if (isObjectIdLike(emp)) return emp;
      return null;
    }).filter(Boolean);

    const teamAssignments = employeeOids.length > 0
      ? await EmployeeTeamAssignment.find({
          ...tenantFilter,
          employeeId: { $in: employeeOids },
          isActive: true,
        })
          .populate('teamId', 'name color')
          .populate('locationId', 'name')
          .lean()
      : [];

    // employeeId string → array of { teamId, teamName, teamColor, locationId, locationName }
    const assignmentsByEmployee = new Map<string, Array<{ teamId: string; teamName: string; teamColor?: string; locationId: string; locationName: string }>>();
    for (const a of teamAssignments as any[]) {
      const empId = a.employeeId.toString();
      if (!assignmentsByEmployee.has(empId)) assignmentsByEmployee.set(empId, []);
      if (!a.teamId || !a.locationId) continue;
      assignmentsByEmployee.get(empId)!.push({
        teamId: a.teamId._id.toString(),
        teamName: a.teamId.name,
        teamColor: a.teamId.color,
        locationId: a.locationId._id.toString(),
        locationName: a.locationId.name,
      });
    }

    const toIso = (d: Date | string | null | undefined) => {
      if (d == null) return undefined;
      const dt = d instanceof Date ? d : new Date(d);
      return Number.isNaN(dt.getTime()) ? undefined : dt.toISOString();
    };

    const resolveUserName = (ref: any): string | undefined => {
      if (!ref) return undefined;
      if (typeof ref === 'object' && ref.name) return String(ref.name);
      return undefined;
    };

    const absences = (docs as any[]).map((doc) => {
      const emp = doc.employeeId as any;
      let employeeOid: string;
      let employeeName = '';
      let employeePin = '';

      if (isPopulatedEmployeeRef(emp)) {
        employeeOid = emp._id.toString();
        employeeName = typeof emp.name === 'string' ? emp.name : '';
        employeePin = typeof emp.pin === 'string' ? emp.pin : '';
      } else if (isObjectIdLike(emp)) {
        employeeOid = (emp as { toString: () => string }).toString();
      } else if (typeof emp === 'string') {
        employeeOid = emp;
      } else {
        employeeOid = String(doc.employeeId ?? '');
      }

      const assignments = assignmentsByEmployee.get(employeeOid) ?? [];

      return {
        id: doc._id.toString(),
        employeeId: employeeOid,
        employeeName,
        employeePin,
        teams: assignments.map((a) => ({ id: a.teamId, name: a.teamName, color: a.teamColor })),
        locations: assignments.map((a) => ({ id: a.locationId, name: a.locationName }))
          .filter((l, i, arr) => arr.findIndex((x) => x.id === l.id) === i), // dedupe
        startDate: toIso(doc.startDate as Date) ?? '',
        endDate: toIso(doc.endDate as Date) ?? '',
        leaveType: String(doc.leaveType ?? ''),
        status: String(doc.status ?? ''),
        notes: typeof doc.notes === 'string' ? doc.notes : '',
        approvedBy: resolveUserName(doc.approvedBy),
        approvedAt: toIso(doc.approvedAt as Date | null),
        deniedBy: resolveUserName(doc.deniedBy),
        deniedAt: toIso(doc.deniedAt as Date | null),
        denialReason: typeof doc.denialReason === 'string' && doc.denialReason ? doc.denialReason : undefined,
        blockAutoFill: Boolean(doc.blockAutoFill),
        createdAt: toIso(doc.createdAt as Date) ?? '',
        updatedAt: toIso(doc.updatedAt as Date) ?? '',
      };
    });

    return { absences, total };
  }
}

export const absenceService = new AbsenceService();
