import { uploadFile } from "@/lib/storage";
import { connectDB } from "@/lib/db";
import { Employee } from "@/lib/db/schemas/employee";

export class EmployeeUploadImageService {
  async upload(auth: { sub?: string; pin?: string } | null, formData: FormData) {
    if (!auth || !auth.sub) return { status: 401, data: { error: "Unauthorized" } };
    
    const file = formData.get("file");
    if (!file || !(file instanceof File)) return { status: 400, data: { error: "No file provided" } };
    if (!file.type.startsWith("image/")) return { status: 400, data: { error: "File must be an image" } };

    // Get employee's orgId from database
    await connectDB();
    const employee = await Employee.findById(auth.sub).select('employer').lean();
    if (!employee || !employee.employer) {
      return { status: 400, data: { error: "Employee organization not found" } };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const result = await uploadFile(buffer, { 
      orgId: employee.employer.toString(),
      uploadedBy: auth.sub,
      folder: "timesheet", 
      filename: `${Date.now()}-${auth.pin}`,
      mimeType: file.type,
    });
    return { status: 200, data: { url: result.url } };
  }
}

export const employeeUploadImageService = new EmployeeUploadImageService();

