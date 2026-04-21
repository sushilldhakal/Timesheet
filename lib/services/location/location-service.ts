import { LocationsDbQueries } from '@/lib/db/queries/locations';
import { connectDB } from '@/lib/db';
import { SUPER_ADMIN_SENTINEL } from '@/lib/auth/auth-api';

function toLocationResponse(l: any) {
  return {
    id: l._id.toString(),
    name: l.name,
    code: l.code,
    address: l.address,
    lat: l.lat,
    lng: l.lng,
    radius: l.radius,
    geofenceMode: l.geofenceMode,
    openingHour: l.openingHour,
    closingHour: l.closingHour,
    workingDays: l.workingDays,
    timezone: l.timezone,
    costCenterId: l.costCenterId,
    color: l.color,
    isActive: l.isActive ?? true,
    createdAt: l.createdAt ? new Date(l.createdAt).toISOString?.() ?? l.createdAt : null,
    updatedAt: l.updatedAt ? new Date(l.updatedAt).toISOString?.() ?? l.updatedAt : null,
  };
}

export class LocationService {
  async list(ctx: any, query: any) {
    await connectDB();
    
    // Guard against sentinel: super admin in "All Organizations" mode has no org selected yet
    if (ctx.tenantId === SUPER_ADMIN_SENTINEL) {
      return { locations: [] };
    }
    
    const search = query?.search?.trim();
    const isActive = query?.isActive;
    const locations = await LocationsDbQueries.listLean({
      tenantId: ctx.tenantId,
      search,
      isActive,
    });
    return { locations: (locations as any[]).map(toLocationResponse) };
  }

  async create(ctx: any, body: any) {
    await connectDB();
    const existing = await LocationsDbQueries.findDuplicateByNameLean({
      tenantId: ctx.tenantId,
      name: body.name,
    });
    if (existing) return { status: 409, data: { error: 'A location with this name already exists' } };

    const created = await LocationsDbQueries.create({
      ...body,
      tenantId: ctx.tenantId,
      name: body.name.trim(),
      createdBy: ctx.auth.sub,
    });

    return { status: 200, data: { location: toLocationResponse(created) } };
  }

  async get(ctx: any, locationId: string) {
    await connectDB();
    const doc = await LocationsDbQueries.findByIdLean(locationId);
    if (!doc) return { status: 404, data: { error: 'Location not found' } };
    if (String((doc as any).tenantId) !== ctx.tenantId) return { status: 403, data: { error: 'Unauthorized' } };
    return { status: 200, data: { location: toLocationResponse(doc) } };
  }

  async update(ctx: any, locationId: string, patch: any) {
    await connectDB();
    const existing = await LocationsDbQueries.findById(locationId);
    if (!existing) return { status: 404, data: { error: 'Location not found' } };
    if (String((existing as any).tenantId) !== ctx.tenantId) return { status: 403, data: { error: 'Unauthorized' } };

    if (patch?.name != null) {
      const dup = await LocationsDbQueries.findDuplicateByNameLean({
        tenantId: String((existing as any).tenantId),
        excludeId: String((existing as any)._id),
        name: String(patch.name),
      });
      if (dup) return { status: 409, data: { error: 'A location with this name already exists' } };
      (existing as any).name = String(patch.name).trim();
    }

    Object.assign(existing, { ...(patch ?? {}), name: (existing as any).name });
    await (existing as any).save();

    return { status: 200, data: { location: toLocationResponse(existing) } };
  }

  async remove(ctx: any, locationId: string) {
    await connectDB();
    const doc = await LocationsDbQueries.findById(locationId);
    if (!doc) return { status: 404, data: { error: 'Location not found' } };
    if (String((doc as any).tenantId) !== ctx.tenantId) return { status: 403, data: { error: 'Unauthorized' } };
    await (doc as any).deleteOne();
    return { status: 200, data: { success: true } };
  }
}

export const locationService = new LocationService();

