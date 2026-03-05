import mongoose from "mongoose"

export interface IDevice {
  deviceId?: string // Optional - set during activation
  deviceName: string // Admin-friendly label (e.g., "Kiosk 1 - Port Melbourne")
  locationName: string // Human-readable location
  locationAddress?: string // Optional physical address
  status: "active" | "disabled" | "revoked"
  registeredBy: mongoose.Types.ObjectId // Reference to User
  registeredAt: Date
  lastActivity: Date
  lastUsedBy?: mongoose.Types.ObjectId // Reference to Employee (last user)
  totalPunches: number // Usage counter
  activationCode?: string // One-time activation code
  activationCodeExpiry?: Date // Expiry for activation code
  revocationReason?: string
  revokedAt?: Date
  revokedBy?: mongoose.Types.ObjectId
}

export interface IDeviceDocument extends IDevice, mongoose.Document {}

const deviceSchema = new mongoose.Schema<IDeviceDocument>(
  {
    deviceId: {
      type: String,
      required: false, // Not required during creation, set during activation
      unique: true, // This creates the unique index
      trim: true,
      sparse: true, // Allow multiple null values
    },
    deviceName: {
      type: String,
      required: true,
      trim: true,
    },
    locationName: {
      type: String,
      required: true,
      trim: true,
    },
    locationAddress: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["active", "disabled", "revoked"],
      default: "active",
    },
    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    registeredAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastActivity: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastUsedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    totalPunches: {
      type: Number,
      default: 0,
    },
    activationCode: {
      type: String,
      trim: true,
      sparse: true, // Allow multiple null values
      index: true, // Single index definition
    },
    activationCodeExpiry: {
      type: Date,
    },
    revocationReason: {
      type: String,
      trim: true,
      default: "",
    },
    revokedAt: {
      type: Date,
    },
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    collection: "devices",
  }
)

// Indexes for fast lookups (deviceId unique index is already created by schema field)
deviceSchema.index({ status: 1 })
deviceSchema.index({ locationName: 1 })
deviceSchema.index({ lastActivity: -1 })
// activationCode index is defined in the schema field above

export const Device =
  (mongoose.models.Device as mongoose.Model<IDeviceDocument>) ??
  mongoose.model<IDeviceDocument>("Device", deviceSchema)
