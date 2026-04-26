import QuotaRequest, { IQuotaRequest, QuotaRequestStatus, QuotaRequestType } from "../schemas/quota-request";
import mongoose from "mongoose";

export class QuotaRequestRepo {
  static async findById(id: string | mongoose.Types.ObjectId): Promise<IQuotaRequest | null> {
    return QuotaRequest.findById(id).lean() as unknown as IQuotaRequest | null;
  }

  static async findByOrgId(orgId: string | mongoose.Types.ObjectId): Promise<IQuotaRequest[]> {
    return QuotaRequest.find({ orgId }).sort({ createdAt: -1 }).lean() as unknown as IQuotaRequest[];
  }

  static async findPendingByOrgIdAndType(
    orgId: string | mongoose.Types.ObjectId,
    requestType: QuotaRequestType
  ): Promise<IQuotaRequest | null> {
    return QuotaRequest.findOne({ orgId, requestType, status: "pending" }).lean() as unknown as IQuotaRequest | null;
  }

  static async findByStatus(status: QuotaRequestStatus): Promise<IQuotaRequest[]> {
    return QuotaRequest.find({ status }).sort({ createdAt: -1 }).populate("orgId", "name").lean() as unknown as IQuotaRequest[];
  }

  static async findAll(filter: any = {}): Promise<IQuotaRequest[]> {
    return QuotaRequest.find(filter).sort({ createdAt: -1 }).populate("orgId", "name").lean() as unknown as IQuotaRequest[];
  }

  static async countByStatus(status: QuotaRequestStatus): Promise<number> {
    return QuotaRequest.countDocuments({ status });
  }

  static async create(
    data: {
      orgId: string | mongoose.Types.ObjectId
      requestType: IQuotaRequest["requestType"]
      currentQuota: number
      requestedQuota: number
      requestNote?: string
      status: IQuotaRequest["status"]
    }
  ): Promise<IQuotaRequest> {
    const request = new QuotaRequest(data);
    return request.save();
  }

  static async updateById(
    id: string | mongoose.Types.ObjectId,
    update: Partial<IQuotaRequest>
  ): Promise<IQuotaRequest | null> {
    return QuotaRequest.findByIdAndUpdate(id, { $set: update }, { new: true }).lean() as unknown as IQuotaRequest | null;
  }

  static async deleteById(id: string | mongoose.Types.ObjectId): Promise<void> {
    await QuotaRequest.deleteOne({ _id: id });
  }
}
