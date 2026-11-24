import { NextResponse } from "next/server";
import { getFlaskBackendUrl, getAdminBackendHeaders } from "@/lib/backend";
import { verifyAdminRequest } from "@/lib/auth";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get("department") || "";
    const year = searchParams.get("year") || "";
    const category = searchParams.get("category") || "";
    const doc_type = searchParams.get("doc_type") || "";
    const institution = searchParams.get("institution") || "";

    const params = new URLSearchParams();
    if (department) params.set("department", department);
    if (year) params.set("year", year);
    if (category) params.set("category", category);
    if (doc_type) params.set("doc_type", doc_type);
    if (institution) params.set("institution", institution);

    const queryString = params.toString();
    const backendUrl = getFlaskBackendUrl();
    const targetUrl = `${backendUrl}/documents${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const result = await response.json();
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error("Documents fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch indexed documents" },
      { status: 502 }
    );
  }
}

export async function DELETE(request) {
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

    const response = await fetch(`${backendUrl}/documents/delete`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const result = await response.json();
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error("Documents delete error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to connect to backend deletion service" },
      { status: 502 }
    );
  }
}
