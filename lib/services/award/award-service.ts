import { AwardsDbQueries } from '@/lib/db/queries/awards';
import { connectDB } from '@/lib/db';

export class AwardService {
  async list(query: any) {
    await connectDB();
    const { page = 1, limit = 50, search = '' } = query || {};
    const mongoQuery: any = {};
    if (search) mongoQuery.name = { $regex: search, $options: 'i' };

    const total = await AwardsDbQueries.count(mongoQuery);
    const awards = await AwardsDbQueries.listLean({ query: mongoQuery, page, limit });

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

  async create(body: any) {
    await connectDB();
    const award = await AwardsDbQueries.create(body);
    return {
      ...award.toObject(),
      _id: award._id.toString(),
      createdAt: award.createdAt.toISOString(),
      updatedAt: award.updatedAt.toISOString(),
    };
  }

  async get(id: string) {
    await connectDB();
    const award = await AwardsDbQueries.findByIdLean(id);
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

  async update(id: string, body: any) {
    await connectDB();
    const award = await AwardsDbQueries.findByIdAndUpdate(id, body);
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

  async remove(id: string) {
    await connectDB();
    const assignedEmployees = await AwardsDbQueries.countAssignedEmployees(id);
    if (assignedEmployees > 0) {
      return {
        status: 409,
        data: {
          error: 'Cannot delete award',
          details: `This award is assigned to ${assignedEmployees} employee(s)`,
        },
      };
    }

    const award = await AwardsDbQueries.deleteById(id);
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

