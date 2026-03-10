import { NextRequest, NextResponse } from "next/server";
import Award from "@/lib/db/schemas/award";
import { connectDB } from "@/lib/db";
import { createApiRoute } from "@/lib/api/create-api-route";
import {
  awardQuerySchema,
  awardCreateSchema,
  awardsListResponseSchema,
  awardCreateResponseSchema,
} from "@/lib/validations/award";
import { errorResponseSchema } from "@/lib/validations/auth";

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/awards',
  summary: 'List awards',
  description: 'Get a paginated list of awards with optional search',
  tags: ['Awards'],
  security: 'adminAuth',
  request: {
    query: awardQuerySchema,
  },
  responses: {
    200: awardsListResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ query }) => {
    try {
      await connectDB();

      const { page = 1, limit = 50, search = "" } = query || {};

      // Build query
      const mongoQuery: any = {};
      if (search) {
        mongoQuery.name = { $regex: search, $options: "i" };
      }

      // Get total count
      const total = await Award.countDocuments(mongoQuery);

      // Get paginated awards
      const awards = await Award.find(mongoQuery)
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      return {
        status: 200,
        data: {
          awards: awards.map(award => ({
            ...award,
            _id: (award as any)._id.toString(),
            createdAt: (award as any).createdAt.toISOString(),
            updatedAt: (award as any).updatedAt.toISOString(),
          })),
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        }
      };
    } catch (error: any) {
      console.error("Error fetching awards:", error);
      return {
        status: 500,
        data: { error: "Failed to fetch awards", details: error.message }
      };
    }
  }
});

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/awards',
  summary: 'Create award',
  description: 'Create a new award',
  tags: ['Awards'],
  security: 'adminAuth',
  request: {
    body: awardCreateSchema,
  },
  responses: {
    201: awardCreateResponseSchema,
    400: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ body }) => {
    try {
      await connectDB();

      // Create new award
      const award = new Award(body!);
      await award.save();

      return {
        status: 201,
        data: {
          ...award.toObject(),
          _id: award._id.toString(),
          createdAt: award.createdAt.toISOString(),
          updatedAt: award.updatedAt.toISOString(),
        }
      };
    } catch (error: any) {
      console.error("Error creating award:", error);

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
        data: { error: "Failed to create award", details: error.message }
      };
    }
  }
});
