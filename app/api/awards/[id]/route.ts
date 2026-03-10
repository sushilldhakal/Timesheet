import { NextRequest, NextResponse } from "next/server";
import Award from "@/lib/db/schemas/award";
import { Employee } from "@/lib/db/schemas/employee";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";
import { createApiRoute } from "@/lib/api/create-api-route";
import {
  awardUpdateSchema,
  awardIdParamSchema,
  singleAwardResponseSchema,
  awardResponseSchema,
} from "@/lib/validations/award";
import { errorResponseSchema, successResponseSchema } from "@/lib/validations/auth";

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/awards/{id}',
  summary: 'Get single award',
  description: 'Get an award by ID',
  tags: ['Awards'],
  security: 'adminAuth',
  request: {
    params: awardIdParamSchema,
  },
  responses: {
    200: singleAwardResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    try {
      await connectDB();

      const { id } = params!;
      const award = await Award.findById(id).lean();

      if (!award) {
        return {
          status: 404,
          data: { error: "Award not found" }
        };
      }

      return {
        status: 200,
        data: {
          ...award,
          _id: (award as any)._id.toString(),
          createdAt: (award as any).createdAt.toISOString(),
          updatedAt: (award as any).updatedAt.toISOString(),
        }
      };
    } catch (error: any) {
      console.error("Error fetching award:", error);
      return {
        status: 500,
        data: { error: "Failed to fetch award", details: error.message }
      };
    }
  }
});

export const PUT = createApiRoute({
  method: 'PUT',
  path: '/api/awards/{id}',
  summary: 'Update award',
  description: 'Update an award by ID',
  tags: ['Awards'],
  security: 'adminAuth',
  request: {
    params: awardIdParamSchema,
    body: awardUpdateSchema,
  },
  responses: {
    200: awardResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    try {
      await connectDB();

      const { id } = params!;

      const award = await Award.findByIdAndUpdate(id, body!, {
        new: true,
        runValidators: true,
      });

      if (!award) {
        return {
          status: 404,
          data: { error: "Award not found" }
        };
      }

      return {
        status: 200,
        data: {
          ...award.toObject(),
          _id: award._id.toString(),
          createdAt: award.createdAt.toISOString(),
          updatedAt: award.updatedAt.toISOString(),
        }
      };
    } catch (error: any) {
      console.error("Error updating award:", error);

      // Handle duplicate name error
      if (error.code === 11000) {
        return {
          status: 409,
          data: { error: "Award name must be unique" }
        };
      }

      // Handle validation errors
      if (error.name === "ValidationError") {
        return {
          status: 400,
          data: { error: "Validation failed", details: error.message }
        };
      }

      return {
        status: 500,
        data: { error: "Failed to update award", details: error.message }
      };
    }
  }
});

export const DELETE = createApiRoute({
  method: 'DELETE',
  path: '/api/awards/{id}',
  summary: 'Delete award',
  description: 'Delete an award by ID (only if not assigned to employees)',
  tags: ['Awards'],
  security: 'adminAuth',
  request: {
    params: awardIdParamSchema,
  },
  responses: {
    200: successResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    try {
      await connectDB();

      const { id } = params!;

      // Check for employee assignments
      const assignedEmployees = await Employee.countDocuments({
        awardId: new mongoose.Types.ObjectId(id),
      });

      if (assignedEmployees > 0) {
        return {
          status: 409,
          data: {
            error: "Cannot delete award",
            details: `This award is assigned to ${assignedEmployees} employee(s)`,
          }
        };
      }

      const award = await Award.findByIdAndDelete(id);

      if (!award) {
        return {
          status: 404,
          data: { error: "Award not found" }
        };
      }

      return {
        status: 200,
        data: { message: "Award deleted successfully" }
      };
    } catch (error: any) {
      console.error("Error deleting award:", error);
      return {
        status: 500,
        data: { error: "Failed to delete award", details: error.message }
      };
    }
  }
});
