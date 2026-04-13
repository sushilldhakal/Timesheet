import mongoose, { Schema, Document } from 'mongoose'

// ─── Rule Template Interface ─────────────────────────────────
export interface IRuleTemplate extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  description: string
  priority: number
  isActive: boolean
  canStack: boolean
  conditions: Record<string, any>
  outcome: Record<string, any>
  category?: string // 'ordinary', 'overtime', 'break', 'allowance', 'toil', 'leave'
  tags?: string[] // For searching/filtering
  isDefault?: boolean // Built-in templates (cannot edit/delete)
  createdAt: Date
  updatedAt: Date
}

const ruleTemplateSchema = new Schema<IRuleTemplate>(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    description: String,
    priority: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    canStack: {
      type: Boolean,
      default: false,
    },
    conditions: {
      type: Schema.Types.Mixed,
      default: {},
    },
    outcome: {
      type: Schema.Types.Mixed,
      required: true,
    },
    category: String,
    tags: [String],
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
)

// Text search index
ruleTemplateSchema.index({ name: 'text', description: 'text' })

export const RuleTemplate = mongoose.models.RuleTemplate ||
  mongoose.model<IRuleTemplate>('RuleTemplate', ruleTemplateSchema)
