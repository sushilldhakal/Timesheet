export class StorageQuotaExceededError extends Error {
  public orgId: string;
  public quotaBytes: number;

  constructor(orgId: string, quotaBytes: number) {
    super(`Storage quota exceeded for organization. Quota: ${quotaBytes} bytes`);
    this.name = "StorageQuotaExceededError";
    this.orgId = orgId;
    this.quotaBytes = quotaBytes;
  }
}
