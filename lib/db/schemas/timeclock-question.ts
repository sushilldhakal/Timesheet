import mongoose from "mongoose"

/**
 * Back-compat note:
 * - Legacy values: "boolean", "multiple_choice"
 * - Preferred values (Tanda-ish): "yesno", "multiselect"
 */
export type TimeclockQuestionType = "text" | "yesno" | "multiselect" | "boolean" | "multiple_choice"

export interface ITimeclockQuestion {
  tenantId: mongoose.Types.ObjectId
  /** Back-compat stored field (use `questionText` in new code). */
  question: string
  /** Alias for `question` (preferred). */
  questionText?: string
  /** When to show this question (e.g. "clock_in", "clock_out"). */
  triggerOn: string
  type: TimeclockQuestionType
  options?: string[]
  order?: number
  isActive: boolean
  createdBy?: mongoose.Types.ObjectId
  createdAt?: Date
  updatedAt?: Date
}

export interface ITimeclockQuestionDocument extends ITimeclockQuestion, mongoose.Document {}

const timeclockQuestionSchema = new mongoose.Schema<ITimeclockQuestionDocument>(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true, index: true },
    question: { type: String, required: true, trim: true, alias: "questionText" },
    triggerOn: { type: String, required: true, index: true, default: "clock_in" },
    type: {
      type: String,
      enum: ["text", "yesno", "multiselect", "boolean", "multiple_choice"],
      required: true,
      default: "text",
    },
    options: { type: [String], default: undefined },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: undefined },
  },
  {
    timestamps: true,
    collection: "timeclock_questions",
  }
)

timeclockQuestionSchema.index({ tenantId: 1, triggerOn: 1, isActive: 1, order: 1 })

export const TimeclockQuestion =
  (mongoose.models.TimeclockQuestion as mongoose.Model<ITimeclockQuestionDocument>) ??
  mongoose.model<ITimeclockQuestionDocument>("TimeclockQuestion", timeclockQuestionSchema)

export default TimeclockQuestion

