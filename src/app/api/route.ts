import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      message: "CSOA Photobooth Management System API",
      version: "1.0.0",
      endpoints: [
        "/api/organizations",
        "/api/events",
        "/api/sessions",
        "/api/queue",
        "/api/templates",
        "/api/gallery",
        "/api/analytics",
        "/api/audit",
        "/api/devices",
        "/api/seed",
      ],
    },
  });
}
