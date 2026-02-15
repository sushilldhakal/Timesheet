import mongoose from "mongoose"
import { CATEGORY_TYPES_LIST, type CategoryType } from "@/lib/config/category-types"

export interface ICategory {
  name: string
  type: CategoryType
  createdAt?: Date
  updatedAt?: Date
}

export interface ICategoryDocument extends ICategory, mongoose.Document {}

const categorySchema = new mongoose.Schema<ICategoryDocument>(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: CATEGORY_TYPES_LIST,
    },
  },
  {
    timestamps: true,
    collection: "categories",
  }
)

categorySchema.index({ type: 1 })
categorySchema.index({ type: 1, name: 1 }, { unique: true })

export const Category =
  (mongoose.models.Category as mongoose.Model<ICategoryDocument>) ??
  mongoose.model<ICategoryDocument>("Category", categorySchema)
