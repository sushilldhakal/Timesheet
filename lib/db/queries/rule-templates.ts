import { RuleTemplate } from "@/lib/db/schemas/rule-template";

export class RuleTemplatesDbQueries {
  static async listLean(query: Record<string, unknown>) {
    return RuleTemplate.find(query).lean();
  }

  static async create(args: any) {
    return RuleTemplate.create(args);
  }

  static async findByIdLean(id: string) {
    return RuleTemplate.findById(id).lean();
  }

  static async findById(id: string) {
    return RuleTemplate.findById(id);
  }

  static async deleteById(id: string) {
    return RuleTemplate.deleteOne({ _id: id });
  }
}

