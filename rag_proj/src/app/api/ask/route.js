import { NextResponse } from "next/server";
import { getFlaskBackendUrl } from "@/lib/backend";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const {
      question,
      department,
      year,
      category,
      selected_pdfs,
      doc_type,
      use_multilingual,
      conversation_history,
      stream,
      institution,
    } = body || {};

    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json({ error: "No question provided" }, { status: 400 });
    }

    // Sanitize conversation history to prevent excessive payload sizes
    const safeHistory = Array.isArray(conversation_history)
      ? conversation_history
          .filter((t) => t && typeof t === "object")
          .map((t) => ({
            role: t.role === "assistant" ? "assistant" : "user",
            content: String(t.content || "").trim().slice(0, 3000),
          }))
          .slice(-6)
      : null;

    const payload = {
      question: question.trim(),
      department: department ? String(department).trim() : null,
      year: year ? String(year).trim() : null,
      category: category ? String(category).trim() : null,
      selected_pdfs: Array.isArray(selected_pdfs)
        ? selected_pdfs.map((p) => String(p).trim()).filter(Boolean)
        : selected_pdfs
        ? [String(selected_pdfs).trim()]
        : null,
      doc_type: doc_type ? String(doc_type).trim() : null,
      use_multilingual: use_multilingual !== undefined ? Boolean(use_multilingual) : null,
      conversation_history: safeHistory,
      stream: Boolean(stream),
      institution: institution ? String(institution).trim() : null,
    };

    const backendUrl = getFlaskBackendUrl();
    let response;
    try {
      response = await fetch(`${backendUrl}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (fetchErr) {
      console.error("Ask fetch connection error:", fetchErr);
      return NextResponse.json(
        { error: "Academic backend service is currently unreachable." },
        { status: 503 }
      );
    }

    // Handle Streaming Response (Sprint 24 Phase 2B)
    if (stream) {
      if (!response.ok) {
        let errJson = await response
          .json()
          .catch(() => ({ error: `Backend returned HTTP ${response.status}` }));
        return NextResponse.json(errJson, { status: response.status });
      }

      return new Response(response.body, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    // Non-streaming response handling (Standard JSON)
    let result;
    try {
      result = await response.json();
    } catch {
      result = { error: `Backend returned non-JSON response (HTTP ${response.status})` };
    }

    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error("Ask error:", error);
    return NextResponse.json(
      { error: "Internal server error processing question." },
      { status: 500 }
    );
  }
}
