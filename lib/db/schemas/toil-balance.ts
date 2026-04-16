import mongoose, { Schema, Document } from "mongoose";

// ─── TOIL Entry ───────────────────────────────────────────
export interface ITOILEntry {
  accrualDate: Date;
  hoursAccrued: number;
  hoursUsed: number;
  hoursExpired: number;
  expiryDate: Date | null;
  status: "active" | "used" | "expired" | "paid_out";
}

// ─── TOIL Balance ─────────────────────────────────────────
export interface ITOILBalance extends Document {
  tenantId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  pin: string;
  year: number;
  entries: ITOILEntry[];
  totalBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

const TOILEntrySchema = new Schema<ITOILEntry>(
  {
    accrualDate: { type: Date, required: true },
    hoursAccrued: { type: Number, required: true },
    hoursUsed: { type: Number, default: 0 },
    hoursExpired: { type: Number, default: 0 },
    expiryDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["active", "used", "expired", "paid_out"],
      default: "active",
    },
  },
  { _id: false }
);

const TOILBalanceSchema = new Schema<ITOILBalance>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Employer", required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    pin: { type: String, required: true },
    year: { type: Number, required: true },
    entries: { type: [TOILEntrySchema], default: [] },
    totalBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Create compound unique index on employeeId and year
TOILBalanceSchema.index({ tenantId: 1, employeeId: 1, year: 1 }, { unique: true });

// Create index on expiryDate for expiry processing
TOILBalanceSchema.index({ "entries.expiryDate": 1 });

export default mongoose.models.TOILBalance ||
  mongoose.model<ITOILBalance>("TOILBalance", TOILBalanceSchema);
