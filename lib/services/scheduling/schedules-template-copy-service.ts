import { connectDB } from "@/lib/db";
import { TemplateManager } from "@/lib/managers/template-manager";

export class SchedulesTemplateCopyService {
  private templateManager = new TemplateManager();

  async copyFromTemplate(body: any) {
    await connectDB();
    const schedule = await this.templateManager.copyTemplateToEmployee(body.templateId, body.employeeId, body.overwrite || false);
    return { status: 201, data: { schedule } };
  }
}

export const schedulesTemplateCopyService = new SchedulesTemplateCopyService();

