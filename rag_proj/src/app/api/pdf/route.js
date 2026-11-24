import { NextResponse } from "next/server";
import { getFlaskBackendUrl } from "@/lib/backend";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get("file");

    if (!file || typeof file !== "string") {
      return NextResponse.json({ error: "Missing or invalid file parameter" }, { status: 400 });
    }

    const cleanName = file.trim();
    if (cleanName.includes("..") || cleanName.includes("/") || cleanName.includes("\\")) {
      return NextResponse.json({ error: "Access denied: Invalid filename format." }, { status: 403 });
    }

    // Proxy request to Flask backend secure document serving endpoint
    const baseBackend = getFlaskBackendUrl();
    const backendUrl = `${baseBackend}/documents/file/${encodeURIComponent(cleanName)}`;
    const response = await fetch(backendUrl);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: "Document not found or access denied." }));
      return NextResponse.json(errData, { status: response.status });
    }

    const pdfBuffer = await response.arrayBuffer();
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${cleanName}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("PDF proxy error:", err);
    return NextResponse.json({ error: "Internal server error streaming document." }, { status: 500 });
  }
}
