import { NextResponse } from "next/server";
import { getFlaskBackendUrl, getAdminBackendHeaders } from "@/lib/backend";
import { verifyAdminRequest } from "@/lib/auth";

export async function POST(request) {
  try {
    // Verify Admin Authentication (Sprint 24 Phase 2A)
    const auth = verifyAdminRequest(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized: Admin authentication required" },
        { status: auth.status || 401 }
      );
    }

    const body = await request.json();
    const backendUrl = getFlaskBackendUrl();
    const headers = getAdminBackendHeaders({ "Content-Type": "application/json" });

    const response = await fetch(`${backendUrl}/documents/preview-delete`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const result = await response.json();
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error("Documents preview-delete error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to connect to backend preview service" },
      { status: 502 }
    );
  }
}
