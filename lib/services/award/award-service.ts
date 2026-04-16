import { AwardsDbQueries } from '@/lib/db/queries/awards';
import { connectDB } from '@/lib/db';

export class AwardService {
  async list(args: { tenantId: string; query: any }) {
    await connectDB();
    const { page = 1, limit = 50, search = '' } = args.query || {};
    const mongoQuery: any = {};
    if (search) mongoQuery.name = { $regex: search, $options: 'i' };

    const total = await AwardsDbQueries.count({ tenantId: args.tenantId, query: mongoQuery });
    const awards = await AwardsDbQueries.listLean({ tenantId: args.tenantId, query: mongoQuery, page, limit });

    return {
      awards: (awards as any[]).map((award) => ({
        ...award,
        _id: (award as any)._id.toString(),
        createdAt: (award as any).createdAt.toISOString(),
        updatedAt: (award as any).updatedAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async create(args: { tenantId: string; body: any }) {
    await connectDB();
    const award = await AwardsDbQueries.create({ tenantId: args.tenantId, body: args.body });
    return {
      ...award.toObject(),
      _id: award._id.toString(),
      createdAt: award.createdAt.toISOString(),
      updatedAt: award.updatedAt.toISOString(),
    };
  }

  async get(args: { tenantId: string; id: string }) {
    await connectDB();
    const award = await AwardsDbQueries.findByIdLean({ tenantId: args.tenantId, id: args.id });
    if (!award) return { status: 404, data: { error: 'Award not found' } };
    return {
      status: 200,
      data: {
        ...award,
        _id: (award as any)._id.toString(),
        createdAt: (award as any).createdAt.toISOString(),
        updatedAt: (award as any).updatedAt.toISOString(),
      },
    };
  }

  async update(args: { tenantId: string; id: string; body: any }) {
    await connectDB();
    const award = await AwardsDbQueries.findByIdAndUpdate({ tenantId: args.tenantId, id: args.id, body: args.body });
    if (!award) return { status: 404, data: { error: 'Award not found' } };
    return {
      status: 200,
      data: {
        ...award.toObject(),
        _id: award._id.toString(),
        createdAt: award.createdAt.toISOString(),
        updatedAt: award.updatedAt.toISOString(),
      },
    };
  }

  async remove(args: { tenantId: string; id: string }) {
    await connectDB();
    const assignedEmployees = await AwardsDbQueries.countAssignedEmployees(args.id);
    if (assignedEmployees > 0) {
      return {
        status: 409,
        data: {
          error: 'Cannot delete award',
          details: `This award is assigned to ${assignedEmployees} employee(s)`,
        },
      };
    }

    const award = await AwardsDbQueries.deleteById({ tenantId: args.tenantId, id: args.id });
    if (!award) return { status: 404, data: { error: 'Award not found' } };
    return { status: 200, data: { message: 'Award deleted successfully' } };
  }

  mapCreateUpdateError(error: any, fallbackMessage: string) {
    if (error?.code === 11000) return { status: 409, data: { error: 'Award name must be unique' } };
    if (error?.name === 'ValidationError') return { status: 400, data: { error: 'Validation failed', details: error.message } };
    return { status: 500, data: { error: fallbackMessage, details: error?.message } };
  }
}

export const awardService = new AwardService();

