import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import type { IClockEvent } from '@/lib/db/schemas/daily-shift';
import { apiErrors } from '@/lib/api/api-error';
import { EmployeeClockDbQueries } from '@/lib/db/queries/employee-clock';
import { isWithinGeofence } from '@/lib/utils/validation/geofence';
import { checkShiftOverlap } from '@/lib/utils/validation/shift-validation';
import { logger } from '@/lib/utils/logger';
import { updateComputedFields } from '@/lib/utils/calculations/shift-calculations';
import { processFaceRecognition } from '@/lib/services/clock/clock-with-face-recognition';
import { connectDB } from '@/lib/db';

export class EmployeeClockService {
  async clock(args: {
    authSub: string;
    body: any;
    headerDeviceId: string;
  }) {
    await connectDB();
    const { authSub, body, headerDeviceId } = args;
    if (!body) throw apiErrors.badRequest('Request body is required');

    const {
      type,
      imageUrl: clientImageUrl,
      date: clientDate,
      time: clientTime,
      lat,
      lng,
      noPhoto,
      offline,
      offlineTimestamp,
      employeePin,
      faceDescriptor: faceDescriptorRaw,
      deviceId,
      deviceName,
    } = body;

    let faceDescriptor: number[] | undefined;
    if (faceDescriptorRaw) {
      try {
        faceDescriptor = JSON.parse(faceDescriptorRaw);
      } catch (err) {
        logger.error('[employee/clock] Failed to parse faceDescriptor:', err);
      }
    }

    let employee: any;
    if (offline && employeePin) {
      employee = await EmployeeClockDbQueries.findEmployeeByPin(employeePin);
      if (!employee) throw apiErrors.notFound('Employee not found for offline sync');
    } else {
      employee = await EmployeeClockDbQueries.findEmployeeById(authSub);
      if (!employee) throw apiErrors.notFound('Employee not found');
    }

    const roleAssignments = await EmployeeClockDbQueries.findActiveRoleAssignments(employee._id);
    const roles = (roleAssignments as any[]).map((a) => (a as any).roleId?.name).filter(Boolean);
    const displayRole = roles[0] || '';

    const finalDeviceId = deviceId || headerDeviceId;
    let deviceLocation = '';
    if (finalDeviceId) {
      const device = await EmployeeClockDbQueries.findDeviceByDeviceId(finalDeviceId);
      if (device) {
        deviceLocation = device.locationName;
        EmployeeClockDbQueries.updateDeviceUsage(device._id, employee._id).catch((err) => {
          logger.error('[employee/clock] Failed to update device activity:', err);
        });
      }
    }

    const imageUrl = (clientImageUrl && clientImageUrl.trim()) || '';
    const latStr = (lat && String(lat).trim()) || '';
    const lngStr = (lng && String(lng).trim()) || '';
    const where = latStr && lngStr ? `${latStr},${lngStr}` : '';

    let flag = !imageUrl || !latStr || !lngStr || noPhoto === true;
    let detectedLocationName = '';
    let detectedLocationId = '';

    const rawLocationNames = (employee.location ?? []) as string[];
    const locationNames = rawLocationNames.map((n) => String(n).trim()).filter(Boolean);

    if (locationNames.length > 0 && latStr && lngStr) {
      const userLat = parseFloat(latStr);
      const userLng = parseFloat(lngStr);

      if (!Number.isNaN(userLat) && !Number.isNaN(userLng)) {
        const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const nameRegex = new RegExp(`^(${locationNames.map(esc).join('|')})$`, 'i');
        const locations = await EmployeeClockDbQueries.findLocationsByNamesRegex(nameRegex);

        let withinFence = false;
        for (const loc of locations as any[]) {
          if (
            loc.lat != null &&
            loc.lng != null &&
            isWithinGeofence(userLat, userLng, loc.lat, loc.lng, loc.radius ?? 100)
          ) {
            withinFence = true;
            detectedLocationName = loc.name;
            detectedLocationId = loc._id.toString();
            break;
          }
        }

        if (!withinFence && (locations as any[]).length > 0) {
          if (type === 'in') {
            const hasHardBlock = (locations as any[]).some((loc) => loc.geofenceMode !== 'soft');
            if (hasHardBlock) throw apiErrors.forbidden('You are not at an approved location.');
          }

          // nearest location display
          let minDistance = Infinity;
          for (const loc of locations as any[]) {
            if (loc.lat != null && loc.lng != null) {
              const R = 6371e3;
              const φ1 = (userLat * Math.PI) / 180;
              const φ2 = (loc.lat * Math.PI) / 180;
              const Δφ = ((loc.lat - userLat) * Math.PI) / 180;
              const Δλ = ((loc.lng - userLng) * Math.PI) / 180;
              const a =
                Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              const distance = R * c;
              if (distance < minDistance) {
                minDistance = distance;
                detectedLocationName = loc.name;
                detectedLocationId = loc._id.toString();
              }
            }
          }
          flag = true;
        }
      }
    } else if (type === 'in' && locationNames.length > 0) {
      throw apiErrors.badRequest('Location is required for clock-in at an assigned location.');
    }

    const now = new Date();
    const dateStr = clientDate && clientDate.trim() ? clientDate.trim() : format(now, 'dd-MM-yyyy', { locale: enUS });

    let timeStr: string;
    if (offline && offlineTimestamp) timeStr = offlineTimestamp;
    else if (clientTime && clientTime.trim()) timeStr = clientTime.trim();
    else timeStr = now.toISOString();

    const [day, month, year] = dateStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

    const clockEvent: IClockEvent = {
      time: new Date(timeStr),
      lat: latStr ? parseFloat(latStr) : undefined,
      lng: lngStr ? parseFloat(lngStr) : undefined,
      image: imageUrl,
      flag,
      deviceId: finalDeviceId,
      deviceLocation: deviceName,
    };

    if (offline) {
      logger.log(`[employee/clock] Processing offline punch: ${type} for employee ${employee.pin} at ${timeStr}`);
    }

    if (type === 'in') {
      const proposedStart = clockEvent.time;
      const proposedEnd = new Date(proposedStart.getTime() + 1);
      const overlap = await checkShiftOverlap(employee._id.toString(), proposedStart, proposedEnd);
      if (overlap.hasOverlap) {
        throw apiErrors.conflict('Shift overlaps with existing shift', { conflictingShiftId: overlap.conflictingShiftId });
      }
      await EmployeeClockDbQueries.upsertClockIn(employee.pin, dateObj, clockEvent);
    } else if (type === 'out') {
      const shift = await EmployeeClockDbQueries.findShiftByPinAndDate(employee.pin, dateObj);
      if (!shift) throw apiErrors.badRequest('No clock-in found for today. Please clock in first.');
      const computed = updateComputedFields((shift as any).clockIn, clockEvent, (shift as any).breakIn, (shift as any).breakOut);
      await EmployeeClockDbQueries.updateClockOut(employee.pin, dateObj, clockEvent, {
        totalBreakMinutes: computed.totalBreakMinutes,
        totalWorkingHours: computed.totalWorkingHours ?? 0,
      });
    } else if (type === 'break') {
      await EmployeeClockDbQueries.updateBreakIn(employee.pin, dateObj, clockEvent);
    } else if (type === 'endBreak') {
      const shift = await EmployeeClockDbQueries.findShiftByPinAndDate(employee.pin, dateObj);
      if (!shift || !(shift as any).breakIn) throw apiErrors.badRequest('No active break found.');
      const computed = updateComputedFields((shift as any).clockIn, (shift as any).clockOut, (shift as any).breakIn, clockEvent);
      await EmployeeClockDbQueries.updateBreakOut(employee.pin, dateObj, clockEvent, {
        totalBreakMinutes: computed.totalBreakMinutes,
        totalWorkingHours: computed.totalWorkingHours ?? 0,
      });
    }

    if (faceDescriptor && imageUrl && detectedLocationId) {
      processFaceRecognition({
        employeeId: employee._id.toString(),
        punchType: type,
        punchTime: new Date(timeStr),
        locationId: detectedLocationId,
        photoUrl: imageUrl,
        faceDescriptor,
        faceQuality: 0.8,
        deviceId: finalDeviceId,
        deviceName,
      }).catch((err) => {
        logger.error('[employee/clock] Face recognition failed:', err);
      });
    }

    return {
      success: true,
      type,
      date: dateStr,
      time: timeStr,
      lat: latStr,
      lng: lngStr,
      where,
      flag,
      offline: offline || false,
      detectedLocation: detectedLocationName,
      deviceLocation,
      syncedAt: offline ? new Date().toISOString() : undefined,
      employee: {
        id: employee._id.toString(),
        pin: employee.pin,
        name: employee.name,
        role: displayRole,
        location: Array.isArray(employee.location) ? employee.location.join(', ') : employee.location || '',
      },
    };
  }
}

export const employeeClockService = new EmployeeClockService();

