import { apiErrors } from '@/lib/api/api-error';
import { PayRunsDbQueries } from '@/lib/db/queries/pay-runs';
import { queuePayRunCalculation, getPayRunJobStatus } from '@/lib/jobs/queue';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

export class PayRunService {
  async createPayRun(args: { ctx: any; body: any }) {
    await connectDB();
    const { ctx, body } = args;
    const { tenantId, startDate, endDate, notes } = body;
    if (!tenantId || tenantId === 'default' || !mongoose.Types.ObjectId.isValid(tenantId)) {
      throw apiErrors.badRequest('Valid tenantId is required');
    }
    if (startDate >= endDate) throw apiErrors.badRequest('Start date must be before end date');

    const existingPayRun = await PayRunsDbQueries.findOverlappingPayRun({ tenantId, startDate, endDate });
    if (existingPayRun) throw apiErrors.badRequest('Pay run date range overlaps with existing pay run');

    const payRun = await PayRunsDbQueries.createPayRun({
      tenantId,
      startDate,
      endDate,
      status: 'draft',
      createdBy: ctx.auth.sub,
      notes,
      totals: { gross: 0, tax: 0, super: 0, net: 0, totalHours: 0, employeeCount: 0 },
    });
    return { success: true, payRun };
  }

  async listPayRuns(args: { bodyQuery: any }) {
    await connectDB();
    const { tenantId, status, page, limit } = args.bodyQuery;
    if (!tenantId || tenantId === 'default' || !mongoose.Types.ObjectId.isValid(tenantId)) throw apiErrors.badRequest('Valid tenantId is required');
    const filter: any = { tenantId };
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [payRuns, total] = await Promise.all([
      PayRunsDbQueries.listPayRunsLean({ filter, skip, limit }),
      PayRunsDbQueries.countPayRuns(filter),
    ]);
    const totalPages = Math.ceil(total / limit);
    return { payRuns, total, page, limit, totalPages };
  }

  async getPayRun(id: string) {
    await connectDB();
    const payRun = await PayRunsDbQueries.findPayRunByIdLean(id);
    if (!payRun) throw apiErrors.notFound('Pay run not found');
    return { payRun };
  }

  async queueCalculation(args: { ctx: any; id: string }) {
    await connectDB();
    const payRun = await PayRunsDbQueries.findPayRunById(args.id);
    if (!payRun) throw apiErrors.notFound('Pay run not found');
    if ((payRun as any).status !== 'draft') {
      throw apiErrors.badRequest(`Cannot calculate pay run with status '${(payRun as any).status}'`, 'Only draft pay runs can be calculated');
    }

    try {
      const job = await queuePayRunCalculation({
        payRunId: (payRun as any)._id.toString(),
        tenantId: (payRun as any).tenantId.toString(),
        startDate: (payRun as any).startDate.toISOString(),
        endDate: (payRun as any).endDate.toISOString(),
        userId: String(args.ctx.auth.sub),
      });
      return { accepted: true, payRunId: (payRun as any)._id.toString(), jobId: String((job as any).id ?? `payrun-${(payRun as any)._id.toString()}`) };
    } catch (queueErr: any) {
      const msg = typeof queueErr?.message === 'string' ? queueErr.message : 'Failed to queue job';
      const isDuplicate = msg.toLowerCase().includes('job') && msg.toLowerCase().includes('exists');
      if (isDuplicate) throw apiErrors.conflict('Pay run calculation is already queued or running', msg);
      throw apiErrors.internal('Failed to start pay run calculation', msg);
    }
  }

  async approvePayRun(args: { ctx: any; id: string }) {
    await connectDB();
    const existing = await PayRunsDbQueries.findPayRunByIdLean(args.id);
    if (!existing) throw apiErrors.notFound("Pay run not found");
    if ((existing as any).status !== "calculated") {
      throw apiErrors.badRequest(
        `Cannot approve pay run with status '${(existing as any).status}'. Must be 'calculated'.`
      );
    }

    const approvedAt = new Date();
    const payRun = await PayRunsDbQueries.approvePayRun({
      id: args.id,
      approvedBy: args.ctx.auth.sub,
      approvedAt,
    });
    if (!payRun) throw apiErrors.notFound("Pay run not found");
    return {
      success: true,
      payRun: { _id: (payRun as any)._id.toString(), status: (payRun as any).status, approvedBy: (payRun as any).approvedBy!.toString(), approvedAt: (payRun as any).approvedAt! },
    };
  }

  async exportPayRun(id: string) {
    await connectDB();
    const payRun = await PayRunsDbQueries.findPayRunByIdLean(id);
    if (!payRun) throw apiErrors.notFound('Pay run not found');

    const payItems = await PayRunsDbQueries.listPayItemsForPayRunLean((payRun as any)._id);
    const employeeMap = new Map<string, { employeeId: string; employeeName: string; totalHours: number; totalAmount: number; payItems: any[] }>();

    for (const item of payItems as any[]) {
      const employeeId = item.employeeId.toString();
      if (!employeeMap.has(employeeId)) {
        const employee = await PayRunsDbQueries.findEmployeeNameLean(employeeId);
        employeeMap.set(employeeId, { employeeId, employeeName: (employee as any)?.name || 'Unknown Employee', totalHours: 0, totalAmount: 0, payItems: [] });
      }
      const employeeData = employeeMap.get(employeeId)!;
      employeeData.totalHours += item.hours;
      employeeData.totalAmount += item.amount;
      employeeData.payItems.push({
        type: item.type,
        name: item.name,
        exportName: item.exportName,
        from: item.from,
        to: item.to,
        hours: item.hours,
        rate: item.rate,
        multiplier: item.multiplier,
        amount: item.amount,
      });
    }

    return {
      payRun: { _id: (payRun as any)._id.toString(), startDate: (payRun as any).startDate, endDate: (payRun as any).endDate, status: (payRun as any).status, totals: (payRun as any).totals },
      employees: Array.from(employeeMap.values()),
    };
  }

  async getStatus(id: string) {
    await connectDB();
    const payRun = await PayRunsDbQueries.findPayRunByIdLean(id);
    if (!payRun) throw apiErrors.notFound('Pay run not found');
    const job = await getPayRunJobStatus(id);
    return { payRunStatus: (payRun as any).status, job, jobError: (payRun as any).jobError, totals: (payRun as any).totals };
  }
}

export const payRunService = new PayRunService();

