import { DailyShift, PayRun } from "@/lib/db"

export class PayrollExportDbQueries {
  static async markPayRunExported(args: {
    payRunId: string
    payrollSystemType: "xero" | "myob" | "apa" | "custom"
    exportReference: string
    exportedBy: string
    exportedAt: Date
  }) {
    return PayRun.findByIdAndUpdate(args.payRunId, {
      exportedAt: args.exportedAt,
      exportType: args.payrollSystemType,
      exportReference: args.exportReference,
      exportedBy: args.exportedBy,
      status: "exported",
    })
  }

  static async markDailyShiftsExported(args: { payRunId: string; exportedAt: Date }) {
    return DailyShift.updateMany(
      { "paySnapshot.payRunId": args.payRunId },
      { exportedAt: args.exportedAt, status: "exported" }
    )
  }
}

