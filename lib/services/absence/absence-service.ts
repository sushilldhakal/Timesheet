import mongoose from 'mongoose';
import { AbsencesDbQueries } from '@/lib/db/queries/absences';
import { connectDB } from '@/lib/db';

type PopulatedEmployeeRef = { _id: mongoose.Types.ObjectId; name?: unknown; pin?: unknown };
function isPopulatedEmployeeRef(v: unknown): v is PopulatedEmployeeRef {
  if (!v || typeof v !== 'object') return false;
  if (v instanceof mongoose.Types.ObjectId) return false;
  return '_id' in v && (v as any)._id instanceof mongoose.Types.ObjectId;
}

export class AbsenceService {
  async listBulk(query: any) {
    await connectDB();
    const { startDate, endDate, employeeId: employeeIds = [], status, leaveType, limit, offset } = query;

    const filter = AbsencesDbQueries.buildFilter({ startDate, endDate, employeeIds, status, leaveType });

    const [total, docs] = await Promise.all([
      AbsencesDbQueries.count(filter),
      AbsencesDbQueries.listLean({ filter, limit, offset }),
    ]);

    const absences = (docs as any[]).map((doc) => {
      const emp = doc.employeeId as any;
      let employeeOid: string;
      let employeeName = '';
      let employeePin = '';

      if (isPopulatedEmployeeRef(emp)) {
        employeeOid = emp._id.toString();
        employeeName = typeof emp.name === 'string' ? emp.name : '';
        employeePin = typeof emp.pin === 'string' ? emp.pin : '';
      } else if (emp instanceof mongoose.Types.ObjectId) {
        employeeOid = emp.toString();
      } else if (typeof emp === 'string') {
        employeeOid = emp;
      } else {
        employeeOid = String(doc.employeeId ?? '');
      }

      const toIso = (d: Date | string | null | undefined) => {
        if (d == null) return undefined;
        const dt = d instanceof Date ? d : new Date(d);
        return Number.isNaN(dt.getTime()) ? undefined : dt.toISOString();
      };

      return {
        id: doc._id.toString(),
        employeeId: employeeOid,
        employeeName,
        employeePin,
        startDate: toIso(doc.startDate as Date) ?? '',
        endDate: toIso(doc.endDate as Date) ?? '',
        leaveType: String(doc.leaveType ?? ''),
        status: String(doc.status ?? ''),
        notes: typeof doc.notes === 'string' ? doc.notes : '',
        approvedBy: doc.approvedBy ? String(doc.approvedBy) : undefined,
        approvedAt: toIso(doc.approvedAt as Date | null),
        deniedBy: doc.deniedBy ? String(doc.deniedBy) : undefined,
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

