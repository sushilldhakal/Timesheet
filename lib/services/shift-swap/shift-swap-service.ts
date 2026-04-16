import { ShiftSwapManager } from "@/lib/managers/shift-swap-manager";
import { connectDB } from "@/lib/db";

export class ShiftSwapService {
  async list(status: any, employeeId?: string) {
    await connectDB();
    const mgr = new ShiftSwapManager();
    const swapRequests = await mgr.getSwapRequests(status, employeeId);
    return { swapRequests };
  }

  async create(body: any) {
    await connectDB();
    const mgr = new ShiftSwapManager();
    const swapRequest = await mgr.createSwapRequest(
      body.requestorId,
      body.recipientId,
      body.shiftAssignmentId,
      body.reason
    );
    return { swapRequest };
  }

  async accept(id: string, body: any) {
    await connectDB();
    const mgr = new ShiftSwapManager();
    const swapRequest = await mgr.acceptSwapRequest(id, body.recipientId);
    return { swapRequest };
  }

  async deny(id: string, body: any) {
    await connectDB();
    const mgr = new ShiftSwapManager();
    const swapRequest = await mgr.denySwapRequest(id, body.managerId, body.reason);
    return { swapRequest };
  }

  async approve(id: string, body: any) {
    await connectDB();
    const mgr = new ShiftSwapManager();
    const swapRequest = await mgr.approveSwapRequest(id, body.managerId, body.organizationId);
    return { swapRequest };
  }

  mapManagerError(err: any, fallback: string) {
    const message = typeof err?.message === "string" ? err.message : "";
    if (message.includes("not found")) return { status: 404, data: { error: message } };
    if (message.includes("not in PENDING")) return { status: 400, data: { error: message } };
    return { status: 500, data: { error: fallback } };
  }
}

export const shiftSwapService = new ShiftSwapService();

