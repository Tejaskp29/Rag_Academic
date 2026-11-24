import { NextResponse } from "next/server";
import { getFlaskBackendUrl, getAdminBackendHeaders } from "@/lib/backend";
import { verifyAdminRequest } from "@/lib/auth";

export async function GET(request) {
  try {
    const auth = verifyAdminRequest(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized: Admin authentication required" },
        { status: auth.status || 401 }
      );
    }

    const backendUrl = getFlaskBackendUrl();
    const headers = getAdminBackendHeaders();

    const response = await fetch(`${backendUrl}/admin/analytics/questions`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const result = await response.json();
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error("Admin analytics GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch question analytics from backend" },
      { status: 502 }
    );
  }
}

export async function DELETE(request) {
  try {
    const auth = verifyAdminRequest(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized: Admin authentication required" },
        { status: auth.status || 401 }
      );
    }

    const backendUrl = getFlaskBackendUrl();
    const headers = getAdminBackendHeaders();

    const response = await fetch(`${backendUrl}/admin/analytics/questions`, {
      method: "DELETE",
      headers,
    });

    const result = await response.json();
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error("Admin analytics DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to clear question analytics on backend" },
      { status: 502 }
    );
  }
}
