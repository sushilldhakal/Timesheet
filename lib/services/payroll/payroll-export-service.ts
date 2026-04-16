import { generatePayrollExport, convertRowsToCSV } from "@/lib/payroll/export-payrun";
import { connectDB } from "@/lib/db";
import { PayrollExportDbQueries } from "@/lib/db/queries/payroll-export";

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
}

export const payrollExportService = new PayrollExportService();

