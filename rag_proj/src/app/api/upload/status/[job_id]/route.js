import { NextResponse } from "next/server";
import { getFlaskBackendUrl, getAdminBackendHeaders } from "@/lib/backend";
import { verifyAdminRequest } from "@/lib/auth";

export async function GET(request, { params }) {
  try {
    const auth = verifyAdminRequest(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized: Admin authentication required" },
        { status: auth.status || 401 }
      );
    }

    const { job_id } = await params;
    if (!job_id) {
      return NextResponse.json({ error: "Missing job_id parameter" }, { status: 400 });
    }

    const backendUrl = getFlaskBackendUrl();
    const headers = getAdminBackendHeaders();
    const response = await fetch(`${backendUrl}/upload/status/${encodeURIComponent(job_id)}`, {
      method: "GET",
      headers,
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error || `Status query failed with HTTP ${response.status}` },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Job status route error:", error);
    return NextResponse.json({ error: "Failed to fetch job status" }, { status: 500 });
  }
}
