import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { EmployerDbQueries } from "@/lib/db/queries/employers";

function mapEmployer(e: any) {
  return {
    id: e._id.toString(),
    name: e.name,
    abn: e.abn,
    contactEmail: e.contactEmail,
    color: e.color,
    defaultAwardId: e.defaultAwardId?.toString(),
    isActive: e.isActive ?? true,
    createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : null,
    updatedAt: e.updatedAt ? new Date(e.updatedAt).toISOString() : null,
  };
}

export class EmployerService {
  async list(query?: { search?: string; isActive?: boolean }) {
    await connectDB();
    const filter: Record<string, unknown> = {};
    const search = query?.search?.trim();
    if (typeof query?.isActive === "boolean") filter.isActive = query.isActive;
    if (search) filter.name = { $regex: search, $options: "i" };
    const employers = await EmployerDbQueries.listEmployers(filter);
    return { status: 200, data: { employers: employers.map(mapEmployer) } };
  }

  async create(body: any) {
    await connectDB();
    const name = body.name.trim();
    const existing = await EmployerDbQueries.findByNameCaseInsensitive(name);
    if (existing) return { status: 409, data: { error: "An employer with this name already exists" } };

    const created = await EmployerDbQueries.createEmployer({ ...body, name });
    return { status: 200, data: { employer: mapEmployer(created) } };
  }

  async getById(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) return { status: 404, data: { error: "Invalid employer ID" } };
    await connectDB();
    const employer = await EmployerDbQueries.findByIdLean(id);
    if (!employer) return { status: 404, data: { error: "Employer not found" } };
    return { status: 200, data: { employer: mapEmployer(employer) } };
  }

  async update(id: string, body: any) {
    if (!mongoose.Types.ObjectId.isValid(id)) return { status: 404, data: { error: "Invalid employer ID" } };
    await connectDB();
    const employer = await EmployerDbQueries.findById(id);
    if (!employer) return { status: 404, data: { error: "Employer not found" } };

    if (body.name && body.name.trim() !== (employer as any).name) {
      const existing = await EmployerDbQueries.findByNameCaseInsensitive(body.name, id);
      if (existing) return { status: 409, data: { error: "An employer with this name already exists" } };
    }

    if (body.name !== undefined) (employer as any).name = body.name.trim();
    if (body.abn !== undefined) (employer as any).abn = body.abn;
    if (body.contactEmail !== undefined) (employer as any).contactEmail = body.contactEmail;
    if (body.color !== undefined) (employer as any).color = body.color;
    if (body.defaultAwardId !== undefined) {
      (employer as any).defaultAwardId = body.defaultAwardId ? new mongoose.Types.ObjectId(body.defaultAwardId) : undefined;
    }
    if (body.isActive !== undefined) (employer as any).isActive = body.isActive;

    await (employer as any).save();
    return { status: 200, data: { employer: mapEmployer(employer) } };
  }

  async delete(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) return { status: 404, data: { error: "Invalid employer ID" } };
    await connectDB();
    const employer = await EmployerDbQueries.deleteById(id);
    if (!employer) return { status: 404, data: { error: "Employer not found" } };
    return { status: 200, data: { success: true } };
  }
}

export const employerService = new EmployerService();

