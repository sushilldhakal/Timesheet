import { ZodError } from "zod";
import { isLikelyObjectIdString } from "@/shared/ids";
import { RuleTemplatesDbQueries } from "@/lib/db/queries/rule-templates";
import { awardRuleSchema } from "@/lib/validations/awards";
import { connectDB } from "@/lib/db";

export class RuleTemplatesService {
  async list(args: { category?: string | null; search?: string | null }) {
    await connectDB();
    const query: any = {};
    if (args.category) query.category = args.category;

    let templates = await RuleTemplatesDbQueries.listLean(query);
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      templates = (templates as any[]).filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          t.description?.toLowerCase().includes(searchLower),
      );
    }

    (templates as any[]).sort((a, b) => {
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return { templates };
  }

  async create(data: any) {
    await connectDB();
    if (!data?.outcome?.type) {
      return {
        status: 400,
        data: {
          error:
            "outcome.type is required. Must be one of: ordinary, overtime, break, allowance, toil, leave",
        },
      };
    }

    const validated = awardRuleSchema.partial({ id: true, createdAt: true, updatedAt: true }).parse({
      name: data.name,
      description: data.description,
      priority: data.priority,
      isActive: data.isActive,
      canStack: data.canStack,
      conditions: data.conditions,
      outcome: data.outcome,
    });

    const template = await RuleTemplatesDbQueries.create({
      name: validated.name,
      description: validated.description,
      priority: validated.priority,
      isActive: validated.isActive,
      canStack: validated.canStack,
      conditions: validated.conditions,
      outcome: validated.outcome,
      category: data.category,
      tags: data.tags,
      isDefault: false,
    });

    return { status: 201, data: template };
  }

  async get(id: string) {
    await connectDB();
    if (!isLikelyObjectIdString(id)) {
      return { status: 400, data: { error: "Invalid template ID" } };
    }
    const template = await RuleTemplatesDbQueries.findByIdLean(id);
    if (!template) return { status: 404, data: { error: "Template not found" } };
    return { status: 200, data: template };
  }

  async update(id: string, data: any) {
    await connectDB();
    if (!isLikelyObjectIdString(id)) {
      return { status: 400, data: { error: "Invalid template ID" } };
    }

    const template = await RuleTemplatesDbQueries.findById(id);
    if (!template) return { status: 404, data: { error: "Template not found" } };
    if ((template as any).isDefault) return { status: 403, data: { error: "Cannot edit default templates" } };

    const validated = awardRuleSchema.partial().parse({
      name: data.name,
      description: data.description,
      priority: data.priority,
      isActive: data.isActive,
      canStack: data.canStack,
      conditions: data.conditions,
      outcome: data.outcome,
    });

    Object.assign(template, {
      name: validated.name || (template as any).name,
      description: validated.description || (template as any).description,
      priority: validated.priority ?? (template as any).priority,
      isActive: validated.isActive ?? (template as any).isActive,
      canStack: validated.canStack ?? (template as any).canStack,
      conditions: validated.conditions || (template as any).conditions,
      outcome: validated.outcome || (template as any).outcome,
      category: data.category || (template as any).category,
      tags: data.tags || (template as any).tags,
    });

    await (template as any).save();
    return { status: 200, data: template };
  }

  async remove(id: string) {
    await connectDB();
    if (!isLikelyObjectIdString(id)) {
      return { status: 400, data: { error: "Invalid template ID" } };
    }

    const template = await RuleTemplatesDbQueries.findById(id);
    if (!template) return { status: 404, data: { error: "Template not found" } };
    if ((template as any).isDefault) return { status: 403, data: { error: "Cannot delete default templates" } };

    await RuleTemplatesDbQueries.deleteById(id);
    return { status: 200, data: { success: true } };
  }

  mapError(error: any, fallbackMessage: string, fallbackStatus = 500) {
    if (error instanceof ZodError) {
      const messages = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
      return { status: 400, data: { error: `Validation failed: ${messages.join("; ")}` } };
    }
    return { status: fallbackStatus, data: { error: error?.message || fallbackMessage } };
  }
}

export const ruleTemplatesService = new RuleTemplatesService();

