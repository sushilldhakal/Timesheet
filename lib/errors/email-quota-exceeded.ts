export class EmailQuotaExceededError extends Error {
  public orgId: string;
  public quotaMonthly: number;

  constructor(orgId: string, quotaMonthly: number) {
    super(`Email quota exceeded for organization. Monthly quota: ${quotaMonthly} emails`);
    this.name = "EmailQuotaExceededError";
    this.orgId = orgId;
    this.quotaMonthly = quotaMonthly;
  }
}
