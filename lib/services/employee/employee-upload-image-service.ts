import { uploadFile } from "@/lib/storage";
import { connectDB } from "@/lib/db";
import { Employee } from "@/lib/db/schemas/employee";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
]

export class EmployeeUploadImageService {
  async upload(auth: { sub?: string; pin?: string } | null, formData: FormData) {
    if (!auth || !auth.sub) return { status: 401, data: { error: "Unauthorized" } };

    const file = formData.get("file");
    if (!file || !(file instanceof File)) return { status: 400, data: { error: "No file provided" } };

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return { status: 400, data: { error: "File must be an image (JPG, PNG, GIF, WebP, SVG) or PDF" } };
    }

    // Get employee's tenantId (ObjectId) from database
    await connectDB();
    const employee = await Employee.findById(auth.sub).select('tenantId').lean();
    if (!employee || !employee.tenantId) {
      return { status: 400, data: { error: "Employee organization not found" } };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const result = await uploadFile(buffer, {
      orgId: employee.tenantId.toString(),
      uploadedBy: auth.sub,
      folder: "onboarding-docs",
      filename: `${Date.now()}-${file.name}`,
      mimeType: file.type,
    });
    return { status: 200, data: { url: result.url } };
  }
}

export const employeeUploadImageService = new EmployeeUploadImageService();
