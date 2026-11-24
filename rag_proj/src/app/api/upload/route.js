import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getFlaskBackendUrl, getAdminBackendHeaders } from "@/lib/backend";
import { verifyAdminRequest } from "@/lib/auth";

const MAX_UPLOAD_SIZE = 25 * 1024 * 1024; // 25 MB

function sanitizeFilename(rawName) {
  if (!rawName || typeof rawName !== "string") return null;
  const base = path.basename(rawName.trim());
  // Reject hidden files, directory traversal or filenames without .pdf
  if (base.startsWith(".") || base.includes("..") || !base.toLowerCase().endsWith(".pdf")) {
    return null;
  }
  // Remove control characters and backslashes
  const cleaned = base.replace(/[\x00-\x1f\x7f\\/]/g, "").trim();
  return cleaned.length > 4 && cleaned.toLowerCase().endsWith(".pdf") ? cleaned : null;
}

export async function POST(request) {
  try {
    // 1. Verify Admin Authentication (Sprint 24 Phase 2A)
    const auth = verifyAdminRequest(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized: Admin authentication required" },
        { status: auth.status || 401 }
      );
    }

    // 2. Pre-check Content-Length header to prevent buffering oversized requests
    const contentLength = request.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: `Upload rejected: Request size exceeds the maximum limit of 25 MB.` },
        { status: 413 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    const rawCategory = formData.get("category");
    const rawDepartment = formData.get("department");
    const rawYear = formData.get("year");
    const rawInstitution = formData.get("institution");
    const rawDocType = formData.get("doc_type");
    const rawConvertLegacy = formData.get("convert_legacy");

    const category = rawCategory?.toString().trim() || null;
    const department = rawDepartment?.toString().trim() || null;
    const year = rawYear?.toString().trim() || null;
    const institution = rawInstitution?.toString().trim() || "dsce";
    const doc_type = rawDocType?.toString().trim() || null;
    const convert_legacy = rawConvertLegacy === "true" || rawConvertLegacy === true;

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        { error: "No valid file uploaded" },
        { status: 400 }
      );
    }

    // 3. File size validation
    if (file.size === 0) {
      return NextResponse.json(
        { error: "Upload rejected: File is empty (0 bytes)." },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: `Upload rejected: File size (${file.size} bytes) exceeds the maximum limit of 25 MB.` },
        { status: 413 }
      );
    }

    // 4. Filename sanitization
    const safeFilename = sanitizeFilename(file.name);
    if (!safeFilename) {
      return NextResponse.json(
        { error: "Upload rejected: Invalid PDF filename. Only valid .pdf files are accepted." },
        { status: 400 }
      );
    }

    // 5. PDF Magic-byte verification (%PDF-)
    // Inspect the first 1024 bytes before saving to disk
    const headerSlice = await file.slice(0, 1024).arrayBuffer();
    const headerBuf = Buffer.from(headerSlice);
    const headerStr = headerBuf.toString("ascii");
    if (!headerStr.startsWith("%PDF-") && !headerStr.includes("%PDF-")) {
      return NextResponse.json(
        { error: "Upload rejected: Invalid file content. File lacks %PDF- header magic bytes." },
        { status: 400 }
      );
    }

    // Storage path resolution
    const folderParts = ["uploads"];
    if (department && year && category) {
      folderParts.push(department, year, category);
    } else {
      folderParts.push("unclassified");
    }

    const uploadDir = path.join(process.cwd(), ...folderParts);
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, safeFilename);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const savedRelativePath = path.relative(process.cwd(), filePath);
    const backendUrl = getFlaskBackendUrl();

    let processResponse;
    try {
      // Forward Admin API Key to Flask backend
      const headers = getAdminBackendHeaders({ "Content-Type": "application/json" });
      processResponse = await fetch(`${backendUrl}/upload/async`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          pdf_path: filePath,
          department,
          year,
          category,
          institution,
          doc_type,
          convert_legacy,
        }),
      });
    } catch (error) {
      console.error("Ingestion server unreachable:", error);
      // Remove saved file on connection failure to keep storage clean
      await unlink(filePath).catch(() => {});
      return NextResponse.json(
        {
          error: "PDF saved, but the ingestion service is unreachable.",
          path: savedRelativePath,
        },
        { status: 502 }
      );
    }

    let processingResult;
    try {
      processingResult = await processResponse.json();
    } catch {
      processingResult = null;
    }

    if (!processResponse.ok || !processingResult?.success) {
      // Remove rejected/failed file on ingestion error
      await unlink(filePath).catch(() => {});
      return NextResponse.json(
        {
          error:
            processingResult?.error ||
            `Document ingestion failed with HTTP ${processResponse.status}`,
          path: savedRelativePath,
          processing: processingResult,
        },
        { status: processResponse.status >= 400 && processResponse.status < 600 ? processResponse.status : 502 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        job_id: processingResult.job_id,
        status: processingResult.status || "queued",
        message: processingResult.message || `Upload queued: ${safeFilename}`,
        path: savedRelativePath,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
