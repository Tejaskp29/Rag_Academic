import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getFlaskBackendUrl, getAdminBackendHeaders } from "@/lib/backend";
import { verifyAdminRequest } from "@/lib/auth";

const MAX_UPLOAD_SIZE = 25 * 1024 * 1024; // 25 MB

function sanitizeFilename(rawName) {
  if (!rawName || typeof rawName !== "string") return null;
  const base = path.basename(rawName.trim());
  if (base.startsWith(".") || base.includes("..") || !base.toLowerCase().endsWith(".pdf")) {
    return null;
  }
  const cleaned = base.replace(/[\x00-\x1f\x7f\\/]/g, "").trim();
  return cleaned.length > 4 && cleaned.toLowerCase().endsWith(".pdf") ? cleaned : null;
}

export async function POST(request) {
  try {
    // 1. Verify Admin Authentication
    const auth = verifyAdminRequest(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized: Admin authentication required" },
        { status: auth.status || 401 }
      );
    }

    // 2. Pre-check Content-Length
    const contentLength = request.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: "Upload rejected: Request size exceeds the maximum limit of 25 MB." },
        { status: 413 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    const targetPdf = formData.get("target_pdf")?.toString().trim();
    const targetHash = formData.get("target_hash")?.toString().trim() || null;
    const targetId = formData.get("target_id")?.toString().trim() || null;

    const rawCategory = formData.get("category");
    const rawDepartment = formData.get("department");
    const rawYear = formData.get("year");
    const rawDocType = formData.get("doc_type");
    const rawConvertLegacy = formData.get("convert_legacy");

    const category = rawCategory?.toString().trim() || null;
    const department = rawDepartment?.toString().trim() || null;
    const year = rawYear?.toString().trim() || null;
    const doc_type = rawDocType?.toString().trim() || null;
    const convert_legacy = rawConvertLegacy === "true" || rawConvertLegacy === true;

    if (!targetPdf && !targetHash && !targetId) {
      return NextResponse.json(
        { error: "Missing target document identification to replace" },
        { status: 400 }
      );
    }

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        { error: "No valid replacement file uploaded" },
        { status: 400 }
      );
    }

    // 3. File size check
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
        { error: "Upload rejected: Invalid replacement filename. Only valid .pdf files are accepted." },
        { status: 400 }
      );
    }

    // 5. PDF Magic-byte check
    const headerSlice = await file.slice(0, 1024).arrayBuffer();
    const headerBuf = Buffer.from(headerSlice);
    const headerStr = headerBuf.toString("ascii");
    if (!headerStr.startsWith("%PDF-") && !headerStr.includes("%PDF-")) {
      return NextResponse.json(
        { error: "Upload rejected: Invalid file content. File lacks %PDF- header magic bytes." },
        { status: 400 }
      );
    }

    const folderParts = ["uploads"];
    if (department && year && category) {
      folderParts.push(department, year, category);
    } else {
      folderParts.push("replacements");
    }

    const uploadDir = path.join(process.cwd(), ...folderParts);
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, safeFilename);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const savedRelativePath = path.relative(process.cwd(), filePath);
    const backendUrl = getFlaskBackendUrl();

    let replaceResponse;
    try {
      const headers = getAdminBackendHeaders({ "Content-Type": "application/json" });
      replaceResponse = await fetch(`${backendUrl}/documents/replace`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          pdf_path: filePath,
          target: {
            source_pdf: targetPdf,
            doc_hash: targetHash,
            doc_id: targetId,
            department: department,
            year: year,
            category: category,
          },
          department,
          year,
          category,
          doc_type,
          convert_legacy,
        }),
      });
    } catch (error) {
      console.error("Replacement server unreachable:", error);
      await unlink(filePath).catch(() => {});
      return NextResponse.json(
        {
          error: "Replacement PDF saved, but the ingestion service is unreachable.",
          path: savedRelativePath,
        },
        { status: 502 }
      );
    }

    let result;
    try {
      result = await replaceResponse.json();
    } catch {
      result = null;
    }

    if (!replaceResponse.ok || !result?.success) {
      await unlink(filePath).catch(() => {});
    }

    return NextResponse.json(result || { error: "Unknown response from ingestion server" }, {
      status: replaceResponse.status,
    });
  } catch (error) {
    console.error("Replace route error:", error);
    return NextResponse.json(
      { error: `Replacement failed: ${error.message}` },
      { status: 500 }
    );
  }
}
