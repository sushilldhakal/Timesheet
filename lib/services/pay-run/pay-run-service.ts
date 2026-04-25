import { apiErrors } from '@/lib/api/api-error';
import { PayRunsDbQueries } from '@/lib/db/queries/pay-runs';
import { queuePayRunCalculation, getPayRunJobStatus } from '@/lib/jobs/queue';
import { connectDB } from '@/lib/db';
import { isLikelyObjectIdString } from '@/shared/ids';

export class PayRunService {
  async createPayRun(args: { ctx: any; body: any }) {
    await connectDB();
    const { ctx, body } = args;
    const { tenantId, startDate, endDate, notes } = body;
    if (!tenantId || tenantId === 'default' || !isLikelyObjectIdString(tenantId)) {
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
    if (!tenantId || tenantId === 'default' || !isLikelyObjectIdString(tenantId)) throw apiErrors.badRequest('Valid tenantId is required');
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
    return this.buildPayRunDetail(payRun);
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
      
      // If Redis is not configured, return a helpful error
      if (msg.includes('REDIS_URL not configured')) {
        throw apiErrors.internal('Pay run calculation requires Redis to be configured', 'Set REDIS_URL in your environment variables');
      }
      
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
    const detail = await this.buildPayRunDetail(payRun);
    return {
      payRun: detail.payRun,
      employees: detail.employees,
    };
  }

  async getStatus(id: string) {
    await connectDB();
    const payRun = await PayRunsDbQueries.findPayRunByIdLean(id);
    if (!payRun) throw apiErrors.notFound('Pay run not found');
    const job = await getPayRunJobStatus(id);
    return { payRunStatus: (payRun as any).status, job, jobError: (payRun as any).jobError, totals: (payRun as any).totals };
  }

  private async buildPayRunDetail(payRun: any) {
    const payRunId = String(payRun._id);
    const [payItems, exportHistory] = await Promise.all([
      PayRunsDbQueries.listPayItemsForPayRunLean(payRun._id),
      PayRunsDbQueries.listPayrollExportsForPayRunLean(payRunId),
    ]);

    const employeeIds = [...new Set((payItems as any[]).map((item) => String(item.employeeId)))];
    const employees = employeeIds.length
      ? await PayRunsDbQueries.findEmployeesByIdsLean(employeeIds)
      : [];

    const employeeNameById = new Map(
      (employees as any[]).map((employee) => [String(employee._id), employee.name || 'Unknown Employee'])
    );

    type PayItemDetail = {
      sourceShiftId: string
      type: string
      name: string
      exportName: string
      from: Date
      to: Date
      hours: number
      rate: number
      multiplier: number
      amount: number
      awardLevel: string
      baseRate: number
    }

    const employeeMap = new Map<string, {
      employeeId: string
      employeeName: string
      totalHours: number
      totalAmount: number
      averageRate: number
      payItemCount: number
      payItems: PayItemDetail[]
    }>();

    const breakdownByType = new Map<string, {
      type: string
      amount: number
      hours: number
      lineCount: number
    }>();

    for (const item of payItems as any[]) {
      const employeeId = String(item.employeeId);
      const employeeData = employeeMap.get(employeeId) ?? {
        employeeId,
        employeeName: employeeNameById.get(employeeId) || 'Unknown Employee',
        totalHours: 0,
        totalAmount: 0,
        averageRate: 0,
        payItemCount: 0,
        payItems: [] as PayItemDetail[],
      };

      employeeData.totalHours += item.hours ?? 0;
      employeeData.totalAmount += item.amount ?? 0;
      employeeData.payItemCount += 1;
      employeeData.payItems.push({
        sourceShiftId: String(item.sourceShiftId),
        type: item.type,
        name: item.name,
        exportName: item.exportName,
        from: item.from,
        to: item.to,
        hours: item.hours,
        rate: item.rate,
        multiplier: item.multiplier,
        amount: item.amount,
        awardLevel: item.awardLevel,
        baseRate: item.baseRate,
      });
      employeeMap.set(employeeId, employeeData);

      const typeSummary = breakdownByType.get(item.type) ?? {
        type: item.type,
        amount: 0,
        hours: 0,
        lineCount: 0,
      };
      typeSummary.amount += item.amount ?? 0;
      typeSummary.hours += item.hours ?? 0;
      typeSummary.lineCount += 1;
      breakdownByType.set(item.type, typeSummary);
    }

    const periodDays = Math.max(
      1,
      Math.round(
        (new Date(payRun.endDate).getTime() - new Date(payRun.startDate).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1
    );

    const employeeSummaries = Array.from(employeeMap.values())
      .map((employee) => ({
        ...employee,
        averageRate: employee.totalHours > 0 ? employee.totalAmount / employee.totalHours : 0,
      }))
      .sort((left, right) => right.totalAmount - left.totalAmount || left.employeeName.localeCompare(right.employeeName));

    const breakdownOrder = ['ordinary', 'penalty', 'overtime', 'allowance', 'leave', 'public_holiday'];
    const payRunTotals = (payRun as any).totals ?? {
      gross: 0,
      tax: 0,
      super: 0,
      net: 0,
      totalHours: 0,
      employeeCount: 0,
    };

    return {
      payRun: {
        ...payRun,
        _id: payRunId,
        tenantId: String(payRun.tenantId),
        createdBy: String(payRun.createdBy),
        approvedBy: payRun.approvedBy ? String(payRun.approvedBy) : undefined,
        exportedBy: payRun.exportedBy ? String(payRun.exportedBy) : undefined,
      },
      summary: {
        periodDays,
        lineItemCount: (payItems as any[]).length,
        averageHourlyCost: payRunTotals.totalHours > 0 ? payRunTotals.gross / payRunTotals.totalHours : 0,
        averageEmployeeCost: payRunTotals.employeeCount > 0 ? payRunTotals.gross / payRunTotals.employeeCount : 0,
      },
      breakdown: {
        byType: Array.from(breakdownByType.values()).sort((left, right) => {
          const leftIndex = breakdownOrder.indexOf(left.type);
          const rightIndex = breakdownOrder.indexOf(right.type);
          if (leftIndex === -1 && rightIndex === -1) return right.amount - left.amount;
          if (leftIndex === -1) return 1;
          if (rightIndex === -1) return -1;
          return leftIndex - rightIndex;
        }),
      },
      employees: employeeSummaries,
      exports: (exportHistory as any[]).map((record) => ({
        _id: String(record._id),
        exportSystem: record.exportSystem,
        status: record.status,
        exportedAt: record.exportedAt,
        rowCount: record.rowCount ?? 0,
        retryCount: record.retryCount ?? 0,
        errorLog: record.errorLog,
        externalRef: record.externalRef,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      })),
    };
  }
}

export const payRunService = new PayRunService();
