/**
 * One-time migration:
 * 1. Ensure all employees have role, employer, location as arrays.
 * 2. Old app used hire → employer and site → location; copy hire into employer
 *    and site into location when those arrays are empty.
 *
 * Run once per database/organisation when moving to this version.
 *
 * Usage (from TimeSheet directory):
 *   node --env-file=.env scripts/migrate-employees-to-arrays.mjs
 * Or:
 *   MONGODB_URI="your-uri" node scripts/migrate-employees-to-arrays.mjs
 */

import mongoose from "mongoose"

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI. Set it in .env or: MONGODB_URI=... node scripts/migrate-employees-to-arrays.mjs")
  process.exit(1)
}

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    pin: { type: String, required: true },
    role: { type: mongoose.Schema.Types.Mixed },
    employer: { type: mongoose.Schema.Types.Mixed },
    location: { type: mongoose.Schema.Types.Mixed },
    hire: String,
    site: String,
    email: String,
    phone: String,
    dob: String,
    comment: String,
    img: String,
  },
  { strict: false, collection: "employees" }
)
const Employee = mongoose.model("Employee", employeeSchema)

function toArray(v) {
  if (v == null || v === "") return []
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean)
  return [String(v).trim()].filter(Boolean)
}

async function run() {
  await mongoose.connect(MONGODB_URI)
  const employees = await Employee.find({}).lean()
  let updated = 0
  for (const doc of employees) {
    let role = toArray(doc.role)
    let employer = toArray(doc.employer)
    let location = toArray(doc.location)

    // Old app: hire → employer, site → location (copy when target is empty)
    const hireVal = doc.hire != null && String(doc.hire).trim() !== "" ? String(doc.hire).trim() : null
    const siteVal = doc.site != null && String(doc.site).trim() !== "" ? String(doc.site).trim() : null
    if (employer.length === 0 && hireVal) employer = [hireVal]
    if (location.length === 0 && siteVal) location = [siteVal]

    const needsUpdate =
      !Array.isArray(doc.role) || !Array.isArray(doc.employer) || !Array.isArray(doc.location) ||
      JSON.stringify(doc.role) !== JSON.stringify(role) ||
      JSON.stringify(doc.employer) !== JSON.stringify(employer) ||
      JSON.stringify(doc.location) !== JSON.stringify(location)
    if (!needsUpdate) continue
    await Employee.updateOne(
      { _id: doc._id },
      { $set: { role, employer, location } }
    )
    updated++
    console.log("Updated:", doc.name ?? doc._id, "| role:", role, "| employer:", employer, "| location:", location)
  }
  console.log("Done. Migrated", updated, "of", employees.length, "employees.")
  await mongoose.disconnect()
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
