import mongoose from "mongoose"
import { ShiftSwapRequest, IShiftSwapRequest, SwapStatus } from "../db/schemas/shift-swap-request"
import { Roster } from "../db/schemas/roster"
import { AvailabilityManager } from "./availability-manager"
import { ComplianceManager } from "./compliance-manager"

/**
 * Shift Swap Manager
 * Manages the shift swap request workflow
 */
export class ShiftSwapManager {
  private availabilityManager: AvailabilityManager
  private complianceManager: ComplianceManager

  constructor() {
    this.availabilityManager = new AvailabilityManager()
    this.complianceManager = new ComplianceManager()
  }

  /**
   * Create a new shift swap request
   * @param requestorId - Employee requesting the swap
   * @param recipientId - Employee being asked to swap
   * @param shiftAssignmentId - The shift to be swapped
   * @param reason - Optional reason for the swap
   * @returns Created swap request
   */
  async createSwapRequest(
    requestorId: string,
    recipientId: string,
    shiftAssignmentId: string,
    reason?: string
  ): Promise<IShiftSwapRequest> {
    const swapRequest = await ShiftSwapRequest.create({
      requestorId: new mongoose.Types.ObjectId(requestorId),
      recipientId: new mongoose.Types.ObjectId(recipientId),
      requestorShiftId: new mongoose.Types.ObjectId(shiftAssignmentId),
      status: "PENDING_RECIPIENT",
      requestedAt: new Date(),
      reason: reason || "",
      auditLog: [
        {
          action: "CREATED",
          userId: new mongoose.Types.ObjectId(requestorId),
          timestamp: new Date(),
          details: "Swap request created",
        },
      ],
    })

    return swapRequest
  }

  /**
   * Recipient accepts the swap request
   * @param swapRequestId - The swap request to accept
   * @param recipientId - The recipient accepting
   * @returns Updated swap request
   */
  async acceptSwapRequest(
    swapRequestId: string,
    recipientId: string
  ): Promise<IShiftSwapRequest> {
    const swapRequest = await ShiftSwapRequest.findById(swapRequestId)
    if (!swapRequest) {
      throw new Error(`Swap request not found: ${swapRequestId}`)
    }

    if (swapRequest.status !== "PENDING_RECIPIENT") {
      throw new Error(`Swap request is not in PENDING_RECIPIENT status`)
    }

    if (swapRequest.recipientId.toString() !== recipientId) {
      throw new Error(`Only the recipient can accept this swap request`)
    }

    swapRequest.status = "PENDING_MANAGER"
    swapRequest.recipientAcceptedAt = new Date()
    swapRequest.auditLog.push({
      action: "ACCEPTED_BY_RECIPIENT",
      userId: new mongoose.Types.ObjectId(recipientId),
      timestamp: new Date(),
      details: "Recipient accepted the swap",
    })

    await swapRequest.save()
    return swapRequest
  }

  /**
   * Manager approves the swap request
   * @param swapRequestId - The swap request to approve
   * @param managerId - The manager approving
   * @param organizationId - Organization context for validation
   * @returns Updated swap request
   */
  async approveSwapRequest(
    swapRequestId: string,
    managerId: string,
    organizationId: string
  ): Promise<IShiftSwapRequest> {
    const swapRequest = await ShiftSwapRequest.findById(swapRequestId)
    if (!swapRequest) {
      throw new Error(`Swap request not found: ${swapRequestId}`)
    }

    if (swapRequest.status !== "PENDING_MANAGER") {
      throw new Error(`Swap request is not in PENDING_MANAGER status`)
    }

    // Load the shifts to validate
    // TODO: This will be fully implemented when we have shift lookup by ID
    // For now, we'll skip validation and proceed with approval

    // Validate both employees for their new shifts
    // const requestorValidation = await this.validateSwapForEmployee(...)
    // const recipientValidation = await this.validateSwapForEmployee(...)

    // if (!requestorValidation.isValid || !recipientValidation.isValid) {
    //   throw new Error("Swap would violate availability or compliance rules")
    // }

    swapRequest.status = "APPROVED"
    swapRequest.managerApprovedAt = new Date()
    swapRequest.managerApprovedBy = new mongoose.Types.ObjectId(managerId)
    swapRequest.auditLog.push({
      action: "APPROVED_BY_MANAGER",
      userId: new mongoose.Types.ObjectId(managerId),
      timestamp: new Date(),
      details: "Manager approved the swap",
    })

    await swapRequest.save()
    return swapRequest
  }

  /**
   * Manager denies the swap request
   * @param swapRequestId - The swap request to deny
   * @param managerId - The manager denying
   * @param reason - Reason for denial
   * @returns Updated swap request
   */
  async denySwapRequest(
    swapRequestId: string,
    managerId: string,
    reason: string
  ): Promise<IShiftSwapRequest> {
    const swapRequest = await ShiftSwapRequest.findById(swapRequestId)
    if (!swapRequest) {
      throw new Error(`Swap request not found: ${swapRequestId}`)
    }

    if (swapRequest.status !== "PENDING_MANAGER") {
      throw new Error(`Swap request is not in PENDING_MANAGER status`)
    }

    swapRequest.status = "DENIED"
    swapRequest.deniedAt = new Date()
    swapRequest.deniedBy = new mongoose.Types.ObjectId(managerId)
    swapRequest.denialReason = reason
    swapRequest.auditLog.push({
      action: "DENIED_BY_MANAGER",
      userId: new mongoose.Types.ObjectId(managerId),
      timestamp: new Date(),
      details: `Manager denied the swap: ${reason}`,
    })

    await swapRequest.save()
    return swapRequest
  }

  /**
   * Execute an approved swap by swapping employee assignments
   * @param swapRequestId - The approved swap request
   */
  async executeSwap(swapRequestId: string): Promise<void> {
    const swapRequest = await ShiftSwapRequest.findById(swapRequestId)
    if (!swapRequest) {
      throw new Error(`Swap request not found: ${swapRequestId}`)
    }

    if (swapRequest.status !== "APPROVED") {
      throw new Error(`Swap request is not approved`)
    }

    // Use a transaction to atomically swap the employee assignments
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
      // TODO: This will be fully implemented when we have shift lookup by ID
      // For now, this is a placeholder
      
      // 1. Find the roster containing the requestor's shift
      // 2. Find the shift by ID
      // 3. Swap the employeeId values
      // 4. Update audit log
      // 5. Commit transaction

      await session.commitTransaction()
    } catch (error) {
      await session.abortTransaction()
      throw error
    } finally {
      session.endSession()
    }
  }

  /**
   * Get swap requests by status
   * @param status - Filter by status
   * @param employeeId - Optional filter by employee (requestor or recipient)
   * @returns Array of swap requests
   */
  async getSwapRequests(
    status?: SwapStatus,
    employeeId?: string
  ): Promise<IShiftSwapRequest[]> {
    const query: any = {}

    if (status) {
      query.status = status
    }

    if (employeeId) {
      const empId = new mongoose.Types.ObjectId(employeeId)
      query.$or = [{ requestorId: empId }, { recipientId: empId }]
    }

    return await ShiftSwapRequest.find(query)
      .sort({ requestedAt: -1 })
      .populate("requestorId", "name")
      .populate("recipientId", "name")
  }
}
