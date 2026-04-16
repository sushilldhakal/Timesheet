import { AwardEngine } from '@/lib/engines/award-engine';
import { connectDB } from '@/lib/db';
import { AwardEvaluationDbQueries } from "@/lib/db/queries/award-evaluation";

export class AwardEvaluationService {
  async evaluateById(args: { id: string; context: any }) {
    await connectDB();
    const award = await AwardEvaluationDbQueries.findAwardById(args.id);
    if (!award) return { status: 404, data: { error: 'Award not found' } };
    if (!(award as any).isActive) return { status: 400, data: { error: 'Award is not active' } };
    const engine = new AwardEngine(award as any);
    const result = engine.processShift(args.context);
    return { status: 200, data: result };
  }
}

export const awardEvaluationService = new AwardEvaluationService();

