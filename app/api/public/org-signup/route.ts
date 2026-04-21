import { NextRequest, NextResponse } from "next/server";
import { OrgSignupService } from "@/lib/services/org-signup/org-signup-service";

// CORS configuration
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") || ["*"];

function corsHeaders(origin: string | null) {
  const allowedOrigin = 
    ALLOWED_ORIGINS.includes("*") || (origin && ALLOWED_ORIGINS.includes(origin))
      ? origin || "*"
      : ALLOWED_ORIGINS[0] || "*";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

// Handle OPTIONS preflight request
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

/**
 * POST /api/public/org-signup
 * Public endpoint for organization signup requests
 * No authentication required
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.orgName || !body.contactName || !body.email) {
      return NextResponse.json(
        { error: "Organization name, contact name, and email are required" },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Submit the request
    const signupRequest = await OrgSignupService.submitRequest({
      orgName: body.orgName,
      contactName: body.contactName,
      email: body.email,
      phone: body.phone,
      companySize: body.companySize,
      planInterest: body.planInterest,
      message: body.message,
      timezone: body.timezone,
    });

    return NextResponse.json(
      { 
        message: "Request submitted successfully",
        requestId: signupRequest._id.toString(),
      },
      { status: 201, headers: corsHeaders(origin) }
    );
  } catch (error: any) {
    console.error("[org-signup POST]", error);

    // Handle specific error messages
    if (error.message?.includes("already exists")) {
      return NextResponse.json(
        { error: error.message },
        { status: 409, headers: corsHeaders(origin) }
      );
    }

    if (error.message?.includes("Invalid email")) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    return NextResponse.json(
      { error: "Failed to submit request. Please try again." },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
