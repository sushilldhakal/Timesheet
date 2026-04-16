import { uploadFile } from "@/lib/storage";

export class EmployeeUploadImageService {
  async upload(auth: { pin?: string } | null, formData: FormData) {
    if (!auth) return { status: 401, data: { error: "Unauthorized" } };
    const file = formData.get("file");
    if (!file || !(file instanceof File)) return { status: 400, data: { error: "No file provided" } };
    if (!file.type.startsWith("image/")) return { status: 400, data: { error: "File must be an image" } };

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const result = await uploadFile(buffer, { folder: "timesheet", filename: `${Date.now()}-${auth.pin}` });
    return { status: 200, data: { url: result.url } };
  }
}

export const employeeUploadImageService = new EmployeeUploadImageService();

