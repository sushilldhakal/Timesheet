import { getAwardHistory } from '@/lib/awards/get-award-for-date';
import { createNewAwardVersion } from '@/lib/awards/create-award-version';
import { AwardVersionsDbQueries } from '@/lib/db/queries/award-versions';
import { connectDB } from '@/lib/db';

export class AwardVersionsService {
  async listVersions(id: string) {
    await connectDB();
    const award = await AwardVersionsDbQueries.ensureAwardExists(id);
    if (!award) return { status: 404, data: { error: 'Award not found' } };

    const versions = await getAwardHistory(id);
    const serialized = (versions as any[]).map((v: any) => ({
      _id: v._id?.toString(),
      baseAwardId: v.baseAwardId?.toString(),
      name: v.name,
      description: v.description,
      version: v.version,
      effectiveFrom: v.effectiveFrom instanceof Date ? v.effectiveFrom.toISOString() : v.effectiveFrom,
      effectiveTo: v.effectiveTo instanceof Date ? v.effectiveTo.toISOString() : v.effectiveTo ?? null,
      changelog: v.changelog ?? null,
      isCurrent: v.isCurrent,
      rules: v.rules ?? [],
      levelRates: v.levelRates ?? [],
      availableTags: v.availableTags ?? [],
      createdAt: v.createdAt instanceof Date ? v.createdAt.toISOString() : v.createdAt,
      createdBy: v.createdBy?.toString(),
    }));
    return { status: 200, data: { versions: serialized } };
  }

  async createVersion(id: string, body: any) {
    await connectDB();
    const award = await AwardVersionsDbQueries.ensureAwardExists(id);
    if (!award) return { status: 404, data: { error: 'Award not found' } };

    const { rules, levelRates, availableTags, name, description, changelog, effectiveFrom: effectiveFromStr, versionBump } = body;
    const effectiveFrom = new Date(effectiveFromStr);
    const now = new Date();
    if (effectiveFrom <= now) return { status: 400, data: { error: 'effectiveFrom must be a future date' } };

    const updatedAward = await createNewAwardVersion(
      award,
      { rules, levelRates, availableTags, name, description },
      { changelog, effectiveFrom, versionBump },
    );

    return {
      status: 201,
      data: {
        award: {
          ...updatedAward.toObject(),
          _id: updatedAward._id.toString(),
          effectiveFrom: updatedAward.effectiveFrom.toISOString(),
          effectiveTo: updatedAward.effectiveTo?.toISOString() ?? null,
          createdAt: updatedAward.createdAt.toISOString(),
          updatedAt: updatedAward.updatedAt.toISOString(),
        },
        message: `Version ${updatedAward.version} created successfully`,
      },
    };
  }

  async getVersion(args: { id: string; versionId: string }) {
    await connectDB();
    const award = await AwardVersionsDbQueries.ensureAwardExistsLean(args.id);
    if (!award) return { status: 404, data: { error: 'Award not found' } };

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(args.versionId);
    if (isObjectId) {
      if ((award as any)._id.toString() === args.versionId) {
        return { status: 200, data: this.serializeCurrentAwardVersion(award) };
      }

      const historyDoc = await AwardVersionsDbQueries.findHistoryByIdLean({ id: args.versionId, baseAwardId: args.id });
      if (!historyDoc) return { status: 404, data: { error: 'Version not found' } };
      return { status: 200, data: this.serializeHistory(historyDoc) };
    }

    if ((award as any).version === args.versionId) {
      return { status: 200, data: this.serializeCurrentAwardVersion(award) };
    }

    const historyByVersion = await AwardVersionsDbQueries.findHistoryByVersionLean({ baseAwardId: args.id, version: args.versionId });
    if (!historyByVersion) return { status: 404, data: { error: 'Version not found' } };
    return { status: 200, data: this.serializeHistory(historyByVersion) };
  }

  private serializeCurrentAwardVersion(award: any) {
    return {
      _id: award._id.toString(),
      name: award.name,
      description: award.description,
      version: award.version,
      effectiveFrom: award.effectiveFrom instanceof Date ? award.effectiveFrom.toISOString() : award.effectiveFrom,
      effectiveTo: award.effectiveTo ? (award.effectiveTo instanceof Date ? award.effectiveTo.toISOString() : award.effectiveTo) : null,
      changelog: award.changelog ?? null,
      isCurrent: true,
      rules: award.rules ?? [],
      levelRates: award.levelRates ?? [],
      availableTags: award.availableTags ?? [],
    };
  }

  private serializeHistory(historyDoc: any) {
    return {
      _id: historyDoc._id.toString(),
      baseAwardId: historyDoc.baseAwardId.toString(),
      name: historyDoc.name,
      description: historyDoc.description,
      version: historyDoc.version,
      effectiveFrom: historyDoc.effectiveFrom instanceof Date ? historyDoc.effectiveFrom.toISOString() : historyDoc.effectiveFrom,
      effectiveTo: historyDoc.effectiveTo ? (historyDoc.effectiveTo instanceof Date ? historyDoc.effectiveTo.toISOString() : historyDoc.effectiveTo) : null,
      changelog: historyDoc.changelog ?? null,
      isCurrent: false,
      rules: historyDoc.rules ?? [],
      levelRates: historyDoc.levelRates ?? [],
      availableTags: historyDoc.availableTags ?? [],
    };
  }
}

export const awardVersionsService = new AwardVersionsService();

