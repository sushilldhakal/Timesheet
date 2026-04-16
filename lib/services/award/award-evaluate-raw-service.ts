import { AwardEngine } from '@/lib/engines/award-engine';
import { awardSchema, shiftContextSchema } from '@/lib/validations/awards';

export class AwardEvaluateRawService {
  evaluate(body: any) {
    const awardResult = awardSchema.safeParse(body?.award);
    if (!awardResult.success) {
      return { status: 400, data: { error: 'Invalid award data', details: awardResult.error.issues } };
    }

    const ctx = body?.context ?? {};
    const contextResult = shiftContextSchema.safeParse({
      ...ctx,
      startTime: new Date(ctx.startTime),
      endTime: new Date(ctx.endTime),
      rosteredStart: ctx.rosteredStart ? new Date(ctx.rosteredStart) : undefined,
      rosteredEnd: ctx.rosteredEnd ? new Date(ctx.rosteredEnd) : undefined,
      breaks:
        ctx.breaks?.map((b: any) => ({
          ...b,
          startTime: new Date(b.startTime),
          endTime: new Date(b.endTime),
        })) || [],
    });

    if (!contextResult.success) {
      return { status: 400, data: { error: 'Invalid shift context', details: contextResult.error.issues } };
    }

    const award = awardResult.data;
    const context = contextResult.data;
    const engine = new AwardEngine(award as any);
    const result = engine.processShift(context as any);

    return {
      status: 200,
      data: {
        success: true,
        result,
        metadata: {
          awardName: (award as any).name,
          employeeId: (context as any).employeeId,
        },
      },
    };
  }

  sample() {
    const sampleAward: any = {
      name: 'Test Retail Award',
      description: 'Sample award for testing',
      rules: [
        {
          name: 'Ordinary Time',
          description: 'Standard 1x rate',
          priority: 1,
          isActive: true,
          canStack: false,
          conditions: {},
          outcome: { type: 'ordinary', multiplier: 1.0, exportName: 'ORD 1x', description: 'Standard rate' },
        },
        {
          name: 'Daily Overtime',
          description: '1.5x rate after 8 hours',
          priority: 10,
          isActive: true,
          canStack: false,
          conditions: { afterHoursWorked: 8 },
          outcome: { type: 'overtime', multiplier: 1.5, exportName: 'OT 1.5x', description: 'Daily overtime' },
        },
      ],
      availableTags: [{ name: 'TOIL' }, { name: 'BrokenShift' }],
      isActive: true,
      version: '1.0.0',
    };

    const sampleContext: any = {
      employeeId: 'emp123',
      employmentType: 'full_time',
      baseRate: 25.5,
      startTime: new Date('2024-01-15T09:00:00Z'),
      endTime: new Date('2024-01-15T18:00:00Z'),
      awardTags: [],
      isPublicHoliday: false,
      weeklyHoursWorked: 32,
      dailyHoursWorked: 9,
      consecutiveShifts: 0,
      breaks: [],
    };

    const engine = new AwardEngine(sampleAward);
    const result = engine.processShift(sampleContext);

    return {
      status: 200,
      data: {
        success: true,
        sampleAward,
        sampleContext,
        result,
        explanation: 'This shows a 9-hour shift with 8 hours ordinary time and 1 hour overtime at 1.5x rate',
      },
    };
  }
}

export const awardEvaluateRawService = new AwardEvaluateRawService();

