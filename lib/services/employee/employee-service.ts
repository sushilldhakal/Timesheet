import mongoose from 'mongoose';
import { apiErrors } from '@/lib/api/api-error';
import { employeeLocationFilter, getFilteredEmployeeIdsByRole, type AuthWithLocations, SUPER_ADMIN_SENTINEL } from '@/lib/auth/auth-api';
import { EmployeeDbQueries } from '@/lib/db/queries/employees';
import { connectDB } from '@/lib/db';
import { syncEmployeePhotoFromPunches } from '@/lib/utils/employees/employee-photo-sync';
import { checkEmailExists } from '@/lib/utils/validation/email-validator';
import { generateTokenWithExpiry } from '@/lib/utils/auth/auth-tokens';
import { sendEmail } from '@/lib/mail/sendEmail';
import { generateOnboardingEmail } from '@/lib/mail/templates/employee-onboarding';
import { generateOnboardingWithPasswordEmail } from '@/lib/mail/templates/employee-onboarding-with-password';
import { generateOnboardingSetupLinkEmail } from '@/lib/mail/templates/employee-onboarding-setup-link';
import { EmployeeTeamAssignment } from '@/lib/db/schemas/employee-team-assignment';
import { Team, Location, Employer } from '@/lib/db';

const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : v != null && v !== '' ? [String(v).trim()] : [];

export class EmployeeService {
  async listEmployees(ctx: AuthWithLocations, query: any) {
    await connectDB();
    const search = query?.search?.trim?.() ?? '';
    const locationFilter = query?.location?.trim?.() ?? '';
    const locationIdFilter = query?.locationId?.trim?.() ?? '';
    const teamFilter = query?.team?.trim?.() ?? '';
    const employerFilter = query?.employer?.trim?.() ?? '';
    const limit = query?.limit ?? 50;
    const offset = query?.offset ?? 0;
    const sortByParam = query?.sortBy ?? 'name';
    const orderParam = query?.order ?? 'asc';

    const locationFilters = locationFilter ? locationFilter.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    const locationIdFilters = locationIdFilter ? locationIdFilter.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    const teamFilters = teamFilter ? teamFilter.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    const employerFilters = employerFilter ? employerFilter.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

    const validSortFields = ['name', 'pin', 'email', 'phone', 'createdAt', 'employer', 'location', 'team'];
    const sortBy = validSortFields.includes(sortByParam) ? sortByParam : 'name';
    const order = orderParam === 'desc' ? -1 : 1;
    const needsAggregation = sortBy === 'team' || sortBy === 'location';

    const andConditions: Record<string, unknown>[] = [];
    const locFilter = employeeLocationFilter(ctx.userLocations);
    if (Object.keys(locFilter).length > 0) andConditions.push(locFilter);

    const roleFilteredEmployeeIds = await getFilteredEmployeeIdsByRole(ctx.userLocations, ctx.managedRoles);
    if (roleFilteredEmployeeIds !== null) {
      andConditions.push({ _id: { $in: roleFilteredEmployeeIds } });
    }

    // Prefer locationId filtering via assignments (stable + tenant-safe). location(name) is deprecated.
    if (locationIdFilters.length > 0) {
      const locOids = locationIdFilters
        .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
        .map((id: string) => new mongoose.Types.ObjectId(id));

      if (locOids.length > 0) {
        const idsAtLocations = await EmployeeTeamAssignment.find({
          locationId: { $in: locOids },
          isActive: true,
        }).distinct("employeeId");

        const strIds = (idsAtLocations as any[]).map((id) => id.toString());
        if (strIds.length > 0) {
          andConditions.push({ _id: { $in: strIds.map((id) => new mongoose.Types.ObjectId(id)) } });
        } else {
          return { employees: [], total: 0, limit, offset };
        }
      }
    } else if (locationFilters.length > 0) {
      andConditions.push({ location: { $in: locationFilters } });
    }
    if (employerFilters.length > 0) andConditions.push({ employer: { $in: employerFilters } });

    // teamFilters -> map team names to ids and then to employeeIds via assignments

    if (teamFilters.length > 0) {
      const teamCategories = await Team.find({ name: { $in: teamFilters } }).lean();
      if (teamCategories.length > 0) {
        const teamIds = teamCategories.map((r: any) => r._id);
        const teamAssignments = await EmployeeTeamAssignment.find({ teamId: { $in: teamIds }, isActive: true }).distinct(
          'employeeId'
        );
        const teamFilteredIds = teamAssignments.map((id: any) => id.toString());
        if (teamFilteredIds.length > 0) {
          andConditions.push({ _id: { $in: teamFilteredIds.map((id: string) => new mongoose.Types.ObjectId(id)) } });
        } else {
          return { employees: [], total: 0, limit, offset };
        }
      }
    }

    const filter: Record<string, unknown> = {};
    if (search) {
      andConditions.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { pin: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { role: { $regex: search, $options: 'i' } },
          { employer: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } },
        ],
      });
    }
    if (andConditions.length > 0) filter.$and = andConditions;

    let employees: any[] = [];
    let total = 0;

    if (needsAggregation) {
      const roleAssignmentCollection = 'employee_team_assignments';
      const roleCollection = 'roles';
      const locationCollection = 'locations';

      const pipeline: object[] = [
        { $match: filter },
        {
          $lookup: {
            from: roleAssignmentCollection,
            let: { empId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $and: [{ $eq: ['$employeeId', '$$empId'] }, { $eq: ['$isActive', true] }] },
                },
              },
              { $sort: { assignedAt: 1 } },
              { $limit: 1 },
            ],
            as: '_primaryAssignment',
          },
        },
        { $unwind: { path: '$_primaryAssignment', preserveNullAndEmptyArrays: true } },
      ];

      if (sortBy === 'team') {
        pipeline.push({
          $lookup: {
            from: roleCollection,
            localField: '_primaryAssignment.teamId',
            foreignField: '_id',
            as: '_roleCategory',
          },
        });
        pipeline.push({ $unwind: { path: '$_roleCategory', preserveNullAndEmptyArrays: true } });
        pipeline.push({
          $addFields: {
            _sortKey: { $toLower: { $ifNull: ['$_roleCategory.name', 'zzz'] } },
          },
        });
      }

      if (sortBy === 'location') {
        pipeline.push({
          $lookup: {
            from: locationCollection,
            localField: '_primaryAssignment.locationId',
            foreignField: '_id',
            as: '_locationCategory',
          },
        });
        pipeline.push({ $unwind: { path: '$_locationCategory', preserveNullAndEmptyArrays: true } });
        pipeline.push({
          $addFields: {
            _sortKey: { $toLower: { $ifNull: ['$_locationCategory.name', 'zzz'] } },
          },
        });
      }

      pipeline.push({ $sort: { _sortKey: order, name: 1 } });
      pipeline.push({
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [{ $skip: offset }, { $limit: limit }],
        },
      });

      const [result] = await EmployeeDbQueries.aggregateEmployees(pipeline);
      total = result?.metadata?.[0]?.total ?? 0;
      employees = result?.data ?? [];
    } else {
      [employees, total] = await Promise.all([
        EmployeeDbQueries.findEmployees(filter, { sort: { [sortBy]: order } as any, offset, limit }),
        EmployeeDbQueries.countEmployees(filter),
      ]);
    }

    const employeeIds = employees.map((e) => e._id);
    const roleAssignments = await EmployeeTeamAssignment.find({
      employeeId: { $in: employeeIds },
      isActive: true,
    })
      .populate('teamId', 'name color')
      .populate('locationId', 'name')
      .lean();

    const locationIds = Array.from(
      new Set(
        roleAssignments
          .filter((ra: any) => ra.locationId && ra.locationId._id)
          .map((ra: any) => ra.locationId._id.toString())
      )
    );
    const locations = await Location.find({ _id: { $in: locationIds.map((id) => new mongoose.Types.ObjectId(id)) } }).lean();
    const locationMap = new Map(
      locations.map((loc: any) => [
        loc._id.toString(),
        {
          id: loc._id.toString(),
          name: loc.name,
          address: loc.address || '',
          lat: loc.lat,
          lng: loc.lng,
          geofence: { radius: loc.radius || 100, mode: loc.geofenceMode || 'soft' },
          hours: { opening: loc.openingHour, closing: loc.closingHour, workingDays: loc.workingDays || [] },
        },
      ])
    );

    const assignmentsByEmployee = new Map<string, any[]>();
    for (const assignment of roleAssignments as any[]) {
      const empId = assignment.employeeId.toString();
      if (!assignmentsByEmployee.has(empId)) assignmentsByEmployee.set(empId, []);
      if (!assignment.locationId || !assignment.teamId) continue;
      const assignmentId = assignment._id.toString();
      const existing = assignmentsByEmployee.get(empId)!;
      if (existing.some((x) => x.id === assignmentId)) continue;
      const location = locationMap.get((assignment.locationId as any)._id.toString());
      existing.push({
        id: assignmentId,
        team: {
          id: (assignment.teamId as any)._id.toString(),
          name: (assignment.teamId as any).name,
          color: (assignment.teamId as any).color,
        },
        location:
          location || {
            id: (assignment.locationId as any)._id.toString(),
            name: (assignment.locationId as any).name,
            address: '',
            lat: undefined,
            lng: undefined,
            geofence: { radius: 100, mode: 'soft' },
            hours: { opening: undefined, closing: undefined, workingDays: [] },
          },
        validFrom: assignment.validFrom.toISOString(),
        validTo: assignment.validTo ? assignment.validTo.toISOString() : null,
        isActive: assignment.isActive,
      });
    }

    const allEmployerNames = Array.from(new Set(employees.flatMap((e) => arr(e.employer))));
    const employers = await Employer.find({ name: { $in: allEmployerNames } }).select('_id name color').lean();
    const employerMap = new Map(employers.map((emp: any) => [emp.name, { id: emp._id.toString(), name: emp.name, color: emp.color }]));

    const normalized = employees.map((e) => {
      const assignments = assignmentsByEmployee.get(e._id.toString()) || [];
      const uniqueLocations = Array.from(new Map(assignments.map((a: any) => [a.location.id, a.location])).values());
      const employerDetails = arr(e.employer)
        .map((name) => employerMap.get(name))
        .filter(Boolean);

      if (!e.img || e.img === '') {
        syncEmployeePhotoFromPunches(e.pin).catch(() => {});
      }

      return {
        id: e._id.toString(),
        name: e.name ?? '',
        pin: e.pin ?? '',
        teams: assignments,
        employers: employerDetails,
        locations: uniqueLocations,
        email: e.email ?? '',
        phone: e.phone ?? '',
        homeAddress: e.homeAddress ?? '',
        dob: e.dob ?? '',
        gender: e.gender ?? '',
        comment: e.comment ?? '',
        img: e.img ?? '',
        employmentType: e.employmentType ?? null,
        standardHoursPerWeek: e.standardHoursPerWeek ?? null,
        awardId: e.awardId ? e.awardId.toString() : null,
        awardLevel: e.awardLevel ?? null,
        onboardingCompleted: e.onboardingCompleted === true,
        onboardingWorkflowStatus: e.onboardingWorkflowStatus ?? 'not_started',
        onboardingCountry: e.onboardingCountry ?? 'AU',
        createdAt: e.createdAt ? e.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: e.updatedAt ? e.updatedAt.toISOString() : new Date().toISOString(),
      };
    });

    const uniqueEmployees = Array.from(new Map(normalized.map((emp) => [emp.id, emp])).values());
    return { employees: uniqueEmployees, total, limit, offset };
  }

  async createEmployee(ctx: AuthWithLocations, body: any) {
    await connectDB();
    if (!body) throw apiErrors.badRequest('Request body is required');

    // Handle super admin case - they need to specify a tenantId or use a default
    if (ctx.tenantId === SUPER_ADMIN_SENTINEL) {
      throw apiErrors.badRequest('Super admin must specify a tenantId when creating employees');
    }

    if (body.email) {
      const emailCheck = await checkEmailExists(body.email);
      if (emailCheck.exists) throw apiErrors.conflict('Email already in use');
    }

    const existing = await EmployeeDbQueries.findEmployeeByPin(body.pin.trim(), ctx.tenantId !== SUPER_ADMIN_SENTINEL ? ctx.tenantId : undefined);
    if (existing) throw apiErrors.conflict('PIN already in use');

    const employeeData: any = {
      tenantId: new mongoose.Types.ObjectId(ctx.tenantId),
      name: body.name.trim(),
      pin: body.pin.trim(),
      employer: body.employer ?? [],
      location: body.location ?? [],
      email: body.email ?? '',
      phone: body.phone ?? '',
      comment: body.comment ?? '',
      img: body.profileImage ?? body.img ?? '',
      employmentType: body.employmentType ?? null,
      standardHoursPerWeek: body.standardHoursPerWeek ?? null,
      awardId: body.awardId ? new mongoose.Types.ObjectId(body.awardId) : null,
      awardLevel: body.awardLevel ?? null,
      certifications: body.certifications?.map((cert: any) => ({
        type: cert.type,
        label: cert.label,
        required: cert.required,
        provided: false, // Will be updated during onboarding
      })) ?? [],
      onboardingWorkflowStatus: 'not_started',
      onboardingInvitedBy: ctx.auth.sub ? new mongoose.Types.ObjectId(ctx.auth.sub) : null,
    };
    
    // Derive onboardingCountry from the first selected location
    if (body.location && body.location.length > 0) {
      const tenantFilter = ctx.tenantId !== SUPER_ADMIN_SENTINEL
        ? { tenantId: new mongoose.Types.ObjectId(ctx.tenantId) }
        : {};
      const firstLocation = await Location.findOne({ name: body.location[0], ...tenantFilter }).lean();
      if (firstLocation && (firstLocation as any).country) {
        employeeData.onboardingCountry = (firstLocation as any).country;
      } else {
        employeeData.onboardingCountry = 'AU'; // Default to AU if location has no country
      }
    } else {
      employeeData.onboardingCountry = 'AU'; // Default to AU if no location selected
    }

    let setupToken: string | undefined;
    if (body.password) {
      employeeData.password = body.password;
      employeeData.passwordSetByAdmin = true;
      employeeData.requirePasswordChange = true;
    } else if (body.sendSetupEmail && body.email) {
      const tokenData = generateTokenWithExpiry(24);
      setupToken = tokenData.token;
      employeeData.passwordSetupToken = tokenData.hashedToken;
      employeeData.passwordSetupExpiry = tokenData.expiry;
    }

    const employee = await EmployeeDbQueries.createEmployee(employeeData);

    // Handle team assignments
    const tenantFilter = ctx.tenantId !== SUPER_ADMIN_SENTINEL
      ? { tenantId: new mongoose.Types.ObjectId(ctx.tenantId) }
      : {};

    if (body.locationTeamAssignments && Array.isArray(body.locationTeamAssignments) && body.locationTeamAssignments.length > 0) {
      // Per-location team assignments (preferred for multi-location)
      const now = new Date();
      for (const assign of body.locationTeamAssignments) {
        try {
          const team = await Team.findOne({ name: assign.team, ...tenantFilter }).lean();
          const location = await Location.findOne({ name: assign.location, ...tenantFilter }).lean();
          if (team && location) {
            await EmployeeTeamAssignment.create({
              tenantId: new mongoose.Types.ObjectId(ctx.tenantId),
              employeeId: employee._id,
              teamId: (team as any)._id,
              locationId: (location as any)._id,
              validFrom: now,
              validTo: null,
              isActive: true,
              assignedBy: new mongoose.Types.ObjectId(ctx.auth.sub),
              assignedAt: now,
              notes: 'Assigned during employee creation',
            });
          }
        } catch (err) {
          console.error('[createEmployee] Failed to create team assignment:', err);
        }
      }
    } else if (body.team?.length > 0 && body.location?.length > 0) {
      // Legacy Cartesian product behavior
      const teamCategories = await Team.find({ name: { $in: body.team }, ...tenantFilter }).lean();
      const locationCategories = await Location.find({ name: { $in: body.location }, ...tenantFilter }).lean();
      const now = new Date();
      for (const teamCategory of teamCategories as any[]) {
        for (const locationCategory of locationCategories as any[]) {
          try {
            await EmployeeTeamAssignment.create({
              tenantId: new mongoose.Types.ObjectId(ctx.tenantId),
              employeeId: employee._id,
              teamId: teamCategory._id,
              locationId: locationCategory._id,
              validFrom: now,
              validTo: null,
              isActive: true,
              assignedBy: new mongoose.Types.ObjectId(ctx.auth.sub),
              assignedAt: now,
              notes: 'Auto-assigned during employee creation',
            });
          } catch (err) {
            console.error('[createEmployee] Failed to create team assignment:', err);
          }
        }
      }
    }

    if (employee.email) {
      try {
        const roleAssignments = await EmployeeTeamAssignment.find({ employeeId: employee._id, isActive: true })
          .populate('teamId', 'name')
          .populate('locationId', 'name')
          .lean();
        const roles = roleAssignments.map((a: any) => a.teamId?.name).filter(Boolean);
        const locations = Array.from(new Set(roleAssignments.map((a: any) => a.locationId?.name).filter(Boolean)));

        let emailContent: any;
        if (body.password) {
          emailContent = generateOnboardingWithPasswordEmail({
            name: employee.name,
            pin: employee.pin,
            email: employee.email,
            phone: employee.phone || 'Not provided',
            roles: roles.length > 0 ? roles : undefined,
            locations: locations.length > 0 ? locations : undefined,
          });
        } else if (body.sendSetupEmail && setupToken) {
          const setupUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/setup-password?token=${setupToken}`;
          emailContent = generateOnboardingSetupLinkEmail({
            name: employee.name,
            pin: employee.pin,
            email: employee.email,
            phone: employee.phone || 'Not provided',
            roles: roles.length > 0 ? roles : undefined,
            locations: locations.length > 0 ? locations : undefined,
            setupUrl,
          });
        } else {
          emailContent = generateOnboardingEmail({
            name: employee.name,
            pin: employee.pin,
            email: employee.email,
            phone: employee.phone || 'Not provided',
            roles: roles.length > 0 ? roles : undefined,
            locations: locations.length > 0 ? locations : undefined,
          });
        }

        await sendEmail({
          to: employee.email,
          subject: 'Welcome to Timesheet - Your Account Details',
          html: emailContent.html,
          plain: emailContent.plain,
          orgId: ctx.tenantId,
        });
      } catch {
        /* ignore */
      }
    }

    // Return in same shape as list item schema expects
    return { employee: { id: employee._id.toString(), name: employee.name, pin: employee.pin, teams: [], employers: [], locations: [], email: employee.email || '', phone: employee.phone || '', homeAddress: employee.homeAddress || '', dob: employee.dob || '', gender: employee.gender || '', comment: employee.comment || '', img: employee.img || '', employmentType: employee.employmentType || null, standardHoursPerWeek: employee.standardHoursPerWeek ?? null, awardId: employee.awardId ? employee.awardId.toString() : null, awardLevel: employee.awardLevel || null, onboardingCompleted: false, onboardingWorkflowStatus: 'not_started', onboardingCountry: (employee as any).onboardingCountry || 'AU', createdAt: employee.createdAt?.toISOString?.() ?? new Date().toISOString(), updatedAt: employee.updatedAt?.toISOString?.() ?? new Date().toISOString() } };
  }

  async getEmployeeDetail(ctx: AuthWithLocations, id: string) {
    await connectDB();
    const empFilter: Record<string, unknown> = { _id: id };
    const locFilter = employeeLocationFilter(ctx.userLocations);
    if (Object.keys(locFilter).length > 0) empFilter.$and = [locFilter];

    const employee = await EmployeeDbQueries.findEmployeeLean(empFilter);
    if (!employee) throw apiErrors.notFound('Employee not found');

    const roleAssignments = await EmployeeTeamAssignment.find({ employeeId: id, isActive: true })
      .populate('teamId', 'name color type')
      .populate('locationId', 'name type')
      .lean();

    const formattedAssignments = (roleAssignments as any[]).map((assignment) => ({
      id: assignment._id.toString(),
      teamId: (assignment.teamId as any)._id.toString(),
      teamName: (assignment.teamId as any).name,
      teamColor: (assignment.teamId as any).color,
      locationId: (assignment.locationId as any)._id.toString(),
      locationName: (assignment.locationId as any).name,
      validFrom: assignment.validFrom,
      validTo: assignment.validTo,
      isActive: assignment.isActive,
    }));

    return { employee: await this.toEmployeeRow(employee as any, formattedAssignments) };
  }

  async updateEmployee(ctx: AuthWithLocations, id: string, body: any) {
    await connectDB();
    const empFilter: Record<string, unknown> = { _id: id };
    const locFilter = employeeLocationFilter(ctx.userLocations);
    if (Object.keys(locFilter).length > 0) empFilter.$and = [locFilter];

    const existing = await EmployeeDbQueries.findEmployee(empFilter);
    if (!existing) throw apiErrors.notFound('Employee not found');

    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.pin !== undefined) {
      const dup = await EmployeeDbQueries.findDuplicatePin(body.pin.trim(), id, ctx.tenantId !== SUPER_ADMIN_SENTINEL ? ctx.tenantId : undefined);
      if (dup) throw apiErrors.conflict('PIN already in use');
      updates.pin = body.pin.trim();
    }
    if (body.employer !== undefined) updates.employer = arr(body.employer);
    if (body.location !== undefined) updates.location = arr(body.location);
    if (body.email !== undefined) updates.email = (body.email ?? '').toString().trim();
    if (body.phone !== undefined) updates.phone = (body.phone ?? '').toString().trim();
    if (body.homeAddress !== undefined) updates.homeAddress = (body.homeAddress ?? '').toString().trim();
    if (body.dob !== undefined) updates.dob = (body.dob ?? '').toString().trim();
    if (body.gender !== undefined) updates.gender = (body.gender ?? '').toString().trim();
    if (body.comment !== undefined) updates.comment = (body.comment ?? '').toString().trim();
    if (body.profileImage !== undefined) updates.img = (body.profileImage ?? '').toString().trim();
    else if (body.img !== undefined) updates.img = (body.img ?? '').toString().trim();
    if (body.standardHoursPerWeek !== undefined) updates.standardHoursPerWeek = body.standardHoursPerWeek;
    if (body.employmentType !== undefined) updates.employmentType = body.employmentType || null;
    if (body.awardId !== undefined) updates.awardId = body.awardId ? new mongoose.Types.ObjectId(body.awardId) : null;
    if (body.awardLevel !== undefined) updates.awardLevel = body.awardLevel || null;
    if (body.certifications !== undefined) {
      updates.certifications = body.certifications.map((cert: any) => ({
        type: cert.type,
        label: cert.label,
        required: cert.required,
        provided: false,
      }));
    }

    if (body.password) {
      const bcrypt = await import('bcrypt');
      const hashedPassword = bcrypt.hashSync(body.password, 10);
      updates.password = hashedPassword;
      updates.passwordSetByAdmin = true;
      updates.requirePasswordChange = true;
      updates.passwordChangedAt = new Date();
    } else if (body.sendSetupEmail && body.email) {
      const tokenData = generateTokenWithExpiry(24);
      updates.passwordSetupToken = tokenData.hashedToken;
      updates.passwordSetupExpiry = tokenData.expiry;
      updates.password = null;
      updates.passwordSetByAdmin = false;
      updates.requirePasswordChange = false;
      updates.passwordChangedAt = null;

      // Email with RAW token needs sending; store raw token for email only.
      try {
        const setupUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/setup-password?token=${tokenData.token}`;
        const emailContent = generateOnboardingSetupLinkEmail({
          name: (existing as any).name,
          pin: (existing as any).pin,
          email: body.email,
          phone: (existing as any).phone || '',
          setupUrl,
        });
        await sendEmail({ 
          to: body.email, 
          subject: emailContent.subject, 
          html: emailContent.html,
          orgId: ctx.tenantId,
        });
      } catch {
        /* ignore */
      }
    }

    // Sync team assignments if team/location changed (legacy behavior preserved)
    if (body.team !== undefined || body.location !== undefined) {

      const teamNames = body.team !== undefined ? arr(body.team) : [];
      const locationNames = body.location !== undefined ? arr(body.location) : [];

      if (teamNames.length > 0 && locationNames.length > 0) {
        // Resolve tenant ID for assignments
        const tenantIdForAssignment = ctx.tenantId !== SUPER_ADMIN_SENTINEL
          ? new mongoose.Types.ObjectId(ctx.tenantId)
          : (existing as any).tenantId;

        // Add tenant filters to queries
        const tenantFilter = ctx.tenantId !== SUPER_ADMIN_SENTINEL
          ? { tenantId: new mongoose.Types.ObjectId(ctx.tenantId) }
          : {};

        const teamCategories = await Team.find({ name: { $in: teamNames }, ...tenantFilter }).lean();
        const locationCategories = await Location.find({ name: { $in: locationNames }, ...tenantFilter }).lean();
        const existingAssignments = await EmployeeTeamAssignment.find({ employeeId: id, isActive: true }).lean();

        const desiredCombos = new Set<string>();
        for (const team of teamCategories as any[]) for (const location of locationCategories as any[]) desiredCombos.add(`${team._id}-${location._id}`);

        const existingCombos = new Map<string, any>();
        for (const assignment of existingAssignments as any[]) existingCombos.set(`${assignment.teamId}-${assignment.locationId}`, assignment);

        const now = new Date();
        for (const [key, assignment] of existingCombos) {
          if (!desiredCombos.has(key)) {
            await EmployeeTeamAssignment.updateOne({ _id: assignment._id }, { $set: { validTo: now, isActive: false } });
          }
        }

        for (const team of teamCategories as any[]) {
          for (const location of locationCategories as any[]) {
            const key = `${team._id}-${location._id}`;
            if (!existingCombos.has(key)) {
              try {
                await EmployeeTeamAssignment.create({
                  tenantId: tenantIdForAssignment,
                  employeeId: id,
                  teamId: team._id,
                  locationId: location._id,
                  validFrom: now,
                  validTo: null,
                  isActive: true,
                  assignedBy: new mongoose.Types.ObjectId(ctx.auth.sub),
                  assignedAt: now,
                  notes: 'Auto-assigned during employee update',
                });
              } catch (err) {
                console.error('[updateEmployee] Failed to create team assignment:', err);
              }
            }
          }
        }
      } else {
        const now = new Date();
        await EmployeeTeamAssignment.updateMany({ employeeId: id, isActive: true }, { $set: { validTo: now, isActive: false } });
      }
    }

    if (Object.keys(updates).length > 0) updates.updatedAt = new Date();
    const updated =
      Object.keys(updates).length > 0
        ? await EmployeeDbQueries.updateEmployeeById(id, updates)
        : await EmployeeDbQueries.findEmployeeLean({ _id: id });

    const roleAssignments = await EmployeeTeamAssignment.find({ employeeId: id, isActive: true })
      .populate('teamId', 'name color type')
      .populate('locationId', 'name type')
      .lean();

    const formattedAssignments = (roleAssignments as any[]).map((assignment) => ({
      id: assignment._id.toString(),
      teamId: (assignment.teamId as any)._id.toString(),
      teamName: (assignment.teamId as any).name,
      teamColor: (assignment.teamId as any).color,
      locationId: (assignment.locationId as any)._id.toString(),
      locationName: (assignment.locationId as any).name,
      validFrom: assignment.validFrom,
      validTo: assignment.validTo,
      isActive: assignment.isActive,
    }));

    return { employee: await this.toEmployeeRow(updated as any, formattedAssignments) };
  }

  async deleteEmployee(ctx: AuthWithLocations, id: string) {
    await connectDB();
    const empFilter: Record<string, unknown> = { _id: id };
    const locFilter = employeeLocationFilter(ctx.userLocations);
    if (Object.keys(locFilter).length > 0) empFilter.$and = [locFilter];
    const deleted = await EmployeeDbQueries.deleteEmployee(empFilter);
    if (!deleted) throw apiErrors.notFound('Employee not found');
    return { success: true };
  }

  private async toEmployeeRow(e: any, roleAssignments: any[] = []) {
    const Award = (await import('@/lib/db/schemas/award')).default;

    const locationIds = Array.from(new Set(roleAssignments.map((ra: any) => ra.locationId.toString())));
    const locations = await Location.find({ _id: { $in: locationIds.map((id) => new mongoose.Types.ObjectId(id)) } }).lean();

    const locationData = locations.map((loc: any) => ({
      id: loc._id.toString(),
      name: loc.name,
      color: loc.color,
      address: loc.address || '',
      lat: loc.lat,
      lng: loc.lng,
      geofence: { radius: loc.radius || 100, mode: loc.geofenceMode || 'soft' },
      hours: { opening: loc.openingHour, closing: loc.closingHour, workingDays: loc.workingDays || [] },
    }));

    const employerNames = arr(e.employer);
    const employers = await Employer.find({ name: { $in: employerNames } }).select('_id name color').lean();
    const employerData = employers.map((emp: any) => ({ id: emp._id.toString(), name: emp.name, color: emp.color }));

    let awardData = null;
    if (e.awardId) {
      const award = await Award.findById(e.awardId).select('_id name description').lean();
      if (award && !Array.isArray(award)) {
        awardData = {
          id: String((award as any)._id),
          name: String((award as any).name || ''),
          level: e.awardLevel || '',
          description: String((award as any).description || ''),
        };
      }
    }

    const formattedTeams = roleAssignments.map((ra: any) => {
      const location = locationData.find((l: any) => l.id === ra.locationId);
      return {
        id: ra.id,
        team: { id: ra.teamId, name: ra.teamName, color: ra.teamColor },
        location:
          location || {
            id: ra.locationId,
            name: ra.locationName,
            color: undefined,
            address: '',
            lat: undefined,
            lng: undefined,
            geofence: { radius: 100, mode: 'soft' },
            hours: { opening: undefined, closing: undefined, workingDays: [] },
          },
        validFrom: ra.validFrom,
        validTo: ra.validTo,
        isActive: ra.isActive,
      };
    });

    return {
      id: e._id,
      name: e.name ?? '',
      pin: e.pin ?? '',
      email: e.email ?? '',
      phone: e.phone ?? '',
      homeAddress: e.homeAddress ?? '',
      img: e.img ?? '',
      dob: e.dob ?? '',
      gender: e.gender ?? '',
      employmentType: e.employmentType,
      standardHoursPerWeek: e.standardHoursPerWeek ?? undefined,
      comment: e.comment ?? '',
      award: awardData,
      teams: formattedTeams,
      employers: employerData,
      locations: locationData,
      passwordSetByAdmin: e.passwordSetByAdmin ?? false,
      requirePasswordChange: e.requirePasswordChange ?? false,
      onboardingCompleted: e.onboardingCompleted === true,
      onboardingCompletedAt: e.onboardingCompletedAt ?? null,
      onboardingStatus: e.onboardingStatus,
      onboardingWorkflowStatus: e.onboardingWorkflowStatus ?? 'not_started',
      onboardingCountry: e.onboardingCountry ?? 'AU',
      legalFirstName: e.legalFirstName,
      legalMiddleNames: e.legalMiddleNames,
      legalLastName: e.legalLastName,
      preferredName: e.preferredName,
      timeZone: e.timeZone,
      locale: e.locale,
      nationality: e.nationality,
      isActive: e.isActive,
      isProbationary: e.isProbationary,
      probationEndDate: e.probationEndDate,
      terminatedAt: e.terminatedAt,
      terminationReason: e.terminationReason,
      skills: e.skills,
      certifications: e.certifications,
      emergencyContact: e.emergencyContact,
      address: e.address,
      passwordSetupExpiry: e.passwordSetupExpiry,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }
}

export const employeeService = new EmployeeService();
