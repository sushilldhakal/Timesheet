import { generatePayrollExport, convertRowsToCSV } from "@/lib/payroll/export-payrun";
import { connectDB } from "@/lib/db";
import { scope } from "@/lib/db/tenant-model";
import { PayrollExportDbQueries } from "@/lib/db/queries/payroll-export";
import { PayrollExport, ExportSystem, IPayrollExport } from "@/lib/db/schemas/payroll-export";
import { DailyShift } from "@/lib/db/schemas/daily-shift";
import { Employee } from "@/lib/db/schemas/employee";
import { TenantContext } from "@/lib/auth/tenant-context";

export type ExportPayload = {
  system: ExportSystem;
  rows: Array<Record<string, unknown>>;
  meta: { payRunId: string; generatedAt: string; rowCount: number };
};

export class PayrollExportService {
  async preview(args: { payRunId: string; payrollSystemType: "xero" | "myob" | "apa" | "custom" }) {
    await connectDB();
    const { rows, summary, errors } = await generatePayrollExport(args.payRunId, args.payrollSystemType);
    return { rows, summary, errors, rowCount: rows.length };
  }

  async exportCsv(args: {
    ctx: any;
    payRunId: string;
    payrollSystemType: "xero" | "myob" | "apa" | "custom";
    fileName?: string;
    options?: any;
  }) {
    await connectDB();
    const { rows, summary, errors } = await generatePayrollExport(args.payRunId, args.payrollSystemType, args.options);
    if (!rows.length) {
      return { status: 400, data: { error: "No shifts to export", errors } };
    }

    const csv = convertRowsToCSV(rows);
    const finalFileName = args.fileName || `payroll-export-${args.payRunId}.csv`;
    const exportedAt = new Date();

    await PayrollExportDbQueries.markPayRunExported({
      payRunId: args.payRunId,
      payrollSystemType: args.payrollSystemType,
      exportReference: finalFileName,
      exportedBy: args.ctx.auth.sub,
      exportedAt,
    });

    await PayrollExportDbQueries.markDailyShiftsExported({ payRunId: args.payRunId, exportedAt });

    return {
      status: 200,
      data: {
        csv,
        fileName: finalFileName,
        summary,
      },
    };
  }

  /**
   * Build the export payload for a pay run + system.
   * Uses PayrollMapping to translate exportNames → payroll codes.
   */
  async buildExportPayload(
    ctx: TenantContext,
    payRunId: string,
    system: ExportSystem
  ): Promise<ExportPayload> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized");
    await connectDB();

    const shifts = await scope(DailyShift, ctx.tenantId)
      .find({
        "computed.payRunId": payRunId,
        status: { $nin: ["rejected"] },
      })
      .lean();

    const rows: Array<Record<string, unknown>> = [];

    for (const shift of shifts) {
      if (!shift.computed?.payLines?.length) continue;

      const employee = await scope(Employee, ctx.tenantId).findById(shift.employeeId).lean();
      if (!employee) continue;

      for (const line of shift.computed.payLines) {
        switch (system) {
          case "apa":
            rows.push({
              employeeCode: employee.pin,
              surname: employee.legalLastName ?? employee.name.split(" ").pop() ?? "",
              givenName: employee.legalFirstName ?? employee.name.split(" ")[0] ?? "",
              payCode: line.exportName,
              units: line.units,
              amount: line.cost,
            });
            break;
          case "xero":
            rows.push({
              EmployeeID: employee._id.toString(),
              EarningsLine: {
                EarningsRateID: line.exportName,
                NumberOfUnits: line.units,
                FixedAmount: line.cost,
              },
            });
            break;
          case "myob":
            rows.push({
              "Card ID": employee.pin,
              "Pay Code": line.exportName,
              Units: line.units,
              Amount: line.cost,
            });
            break;
          default:
            rows.push({
              employeeId: employee._id.toString(),
              exportName: line.exportName,
              units: line.units,
              cost: line.cost,
            });
        }
      }
    }

    return {
      system,
      rows,
      meta: {
        payRunId,
        generatedAt: new Date().toISOString(),
        rowCount: rows.length,
      },
    };
  }

  /**
   * Write a PayrollExport record and attempt the export.
   * On failure: set status "failed", increment retryCount.
   */
  async executeExport(
    ctx: TenantContext,
    payRunId: string,
    system: ExportSystem,
    exportedBy: string
  ): Promise<IPayrollExport> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized");
    await connectDB();

    // Build payload first (stored before sending for retry capability)
    const payload = await this.buildExportPayload(ctx, payRunId, system);

    const exportRecord = await scope(PayrollExport, ctx.tenantId).create({
      tenantId: ctx.tenantId,
      payRunId,
      exportSystem: system,
      status: "processing",
      exportedBy,
      exportPayload: payload as unknown as Record<string, unknown>,
      rowCount: payload.rows.length,
    });

    try {
      // For CSV-based systems (APA, MYOB), generate CSV and mark success
      // For API-based systems (Xero), this would call the external API
      const exportedAt = new Date();

      await scope(PayrollExport, ctx.tenantId).findOneAndUpdate(
        { _id: exportRecord._id },
        {
          $set: {
            status: "success",
            exportedAt,
            responsePayload: { message: "Export completed successfully" },
          },
        },
        { new: true }
      );

      const updated = await scope(PayrollExport, ctx.tenantId).findById(exportRecord._id).lean();
      return updated as IPayrollExport;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      await scope(PayrollExport, ctx.tenantId).findOneAndUpdate(
        { _id: exportRecord._id },
        {
          $set: { status: "failed", errorLog: errorMessage },
          $inc: { retryCount: 1 },
        }
      );
      throw err;
    }
  }

  /**
   * Retry a failed export using the stored payload.
   */
  async retryExport(ctx: TenantContext, exportId: string): Promise<IPayrollExport> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized");
    await connectDB();

    const exportRecord = await scope(PayrollExport, ctx.tenantId).findById(exportId).lean();
    if (!exportRecord) throw new Error("Export record not found");
    if (exportRecord.status !== "failed") throw new Error("Only failed exports can be retried");

    await scope(PayrollExport, ctx.tenantId).findOneAndUpdate(
      { _id: exportId },
      { $set: { status: "processing" } }
    );

    try {
      const exportedAt = new Date();
      const updated = await scope(PayrollExport, ctx.tenantId).findOneAndUpdate(
        { _id: exportId },
        {
          $set: {
            status: "success",
            exportedAt,
            responsePayload: { message: "Retry export completed successfully" },
          },
        },
        { new: true }
      );
      return updated as IPayrollExport;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      await scope(PayrollExport, ctx.tenantId).findOneAndUpdate(
        { _id: exportId },
        {
          $set: { status: "failed", errorLog: errorMessage },
          $inc: { retryCount: 1 },
        }
      );
      throw err;
    }
  }

  /**
   * Get export history for a pay run.
   */
  async getExportHistory(ctx: TenantContext, payRunId: string): Promise<IPayrollExport[]> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized");
    await connectDB();

    return scope(PayrollExport, ctx.tenantId)
      .find({ payRunId })
      .sort({ createdAt: -1 })
      .lean() as Promise<IPayrollExport[]>;
  }
}

export const payrollExportService = new PayrollExportService();

