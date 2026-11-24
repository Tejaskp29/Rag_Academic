"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import PdfViewerModal from "@/components/PdfViewerModal";

export function groupSources(sources) {
  if (!Array.isArray(sources) || sources.length === 0) {
    return [];
  }

  const grouped = new Map();

  for (const item of sources) {
    if (!item || typeof item !== "object") continue;

    const trimmed = item.pdf ? String(item.pdf).trim() : "";
    const pdf = trimmed.length > 0 ? trimmed : "Unknown Document";
    if (!grouped.has(pdf)) {
      grouped.set(pdf, new Set());
    }

    if (item.page !== undefined && item.page !== null) {
      const pageNum = Number(item.page);
      if (!Number.isNaN(pageNum)) {
        grouped.get(pdf).add(pageNum);
      }
    }
  }

  return Array.from(grouped.entries()).map(([pdf, pageSet]) => ({
    pdf,
    pages: Array.from(pageSet).sort((a, b) => a - b),
  }));
}

const CATEGORY_META = {
  syllabus: { name: "Syllabus & Scheme", icon: "📘" },
  notes: { name: "Lecture Notes", icon: "📝" },
  lab_manual: { name: "Lab Manual", icon: "💻" },
  fee: { name: "Fee Structure", icon: "💰" },
  exam: { name: "Exam & Merit List", icon: "🏆" },
  placement: { name: "Placement Records", icon: "💼" },
  admission: { name: "Admission Guidelines", icon: "🎓" },
  general: { name: "General / Other", icon: "📄" },
};

const INSTITUTION_META = {
  dsce: { name: "Dayananda Sagar College of Engineering (DSCE)", short: "DSCE", icon: "🏛️" },
  msrit: { name: "M.S. Ramaiah Institute of Technology (MSRIT)", short: "MSRIT", icon: "🏢" },
  ktbs: { name: "Karnataka Textbook Society (KTBS)", short: "KTBS", icon: "📖" },
  general: { name: "General Academic / Coursework", short: "General", icon: "📚" },
};

export default function AskPage() {
  const [question, setQuestion] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [category, setCategory] = useState("");
  const [institution, setInstitution] = useState("");

  // Document selection states
  const [availableDocs, setAvailableDocs] = useState([]);
  const [branchesSummary, setBranchesSummary] = useState([]);
  const [branchesCount, setBranchesCount] = useState(0);
  const [selectedPdfs, setSelectedPdfs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [docDropdownOpen, setDocDropdownOpen] = useState(false);

  // Conversational message history
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // In-flight cancellation controller
  const abortControllerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // PDF Viewer Modal state
  const [pdfModal, setPdfModal] = useState({
    isOpen: false,
    pdf: "",
    page: 1,
  });

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Read URL query parameters on initial mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const initialQuery = params.get("q");
      const initialDept = params.get("department");
      const initialCat = params.get("category");
      const initialPdf = params.get("pdf");

      if (initialQuery) setQuestion(initialQuery);
      if (initialDept) setDepartment(initialDept);
      if (initialCat) setCategory(initialCat);
      if (initialPdf) setSelectedPdfs([initialPdf]);
      if (initialDept || initialCat || initialPdf) setShowFilters(true);
    }
  }, []);

  // Fetch available documents when metadata filters change
  useEffect(() => {
    let isMounted = true;
    async function loadDocuments() {
      setDocsLoading(true);
      setDocsError("");
      try {
        const params = new URLSearchParams();
        if (institution) params.set("institution", institution);
        if (department) params.set("department", department);
        if (year) params.set("year", year);
        if (category) params.set("category", category);

        const qs = params.toString();
        const res = await fetch(`/api/documents${qs ? `?${qs}` : ""}`);
        const data = await res.json();

        if (isMounted) {
          if (res.ok && data.success) {
            const docs = data.documents || [];
            setAvailableDocs(docs);
            setBranchesSummary(data.branches_summary || []);
            setBranchesCount(data.branches_count || 0);

            const validPdfNames = new Set(docs.map((d) => d.pdf));
            setSelectedPdfs((prev) => prev.filter((p) => validPdfNames.has(p)));
          } else {
            setDocsError(data.error || "Failed to load documents");
          }
        }
      } catch (err) {
        if (isMounted) {
          setDocsError(err.message || "Network error loading documents");
        }
      } finally {
        if (isMounted) {
          setDocsLoading(false);
        }
      }
    }

    loadDocuments();
    return () => {
      isMounted = false;
    };
  }, [institution, department, year, category]);

  function handleTogglePdf(pdfName) {
    setSelectedPdfs((prev) => {
      if (prev.includes(pdfName)) {
        return prev.filter((p) => p !== pdfName);
      } else {
        return [...prev, pdfName];
      }
    });
  }

  function handleSelectAll() {
    setSelectedPdfs(availableDocs.map((d) => d.pdf));
  }

  function handleClearSelection() {
    setSelectedPdfs([]);
  }

  function handleClearScope() {
    setDepartment("");
    setCategory("");
    setYear("");
    setInstitution("");
    setSelectedPdfs([]);
    setDocDropdownOpen(false);
  }

  function handleClearChat() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setMessages([]);
    setErrorMsg("");
  }

  function handleStopGenerating() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
    }
  }

  function openPdfViewer(pdf, page) {
    setPdfModal({
      isOpen: true,
      pdf,
      page: Number(page) || 1,
    });
  }

  // Hierarchical group of available documents by branch and category for the checklist
  const docsByBranchAndCategory = useMemo(() => {
    const grouped = {};
    for (const doc of availableDocs) {
      const dept = (doc.department || "GENERAL").toUpperCase();
      const cat = (doc.category || "general").toLowerCase();

      if (!grouped[dept]) {
        grouped[dept] = {};
      }
      if (!grouped[dept][cat]) {
        grouped[dept][cat] = [];
      }
      grouped[dept][cat].push(doc);
    }
    return grouped;
  }, [availableDocs]);

  async function handleAsk(e) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    // Automatically collapse filters and document dropdown on ask to ensure answer visibility
    setShowFilters(false);
    setDocDropdownOpen(false);

    setErrorMsg("");
    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;

    const userMessage = {
      id: userMessageId,
      role: "user",
      content: trimmed,
    };

    const assistantPlaceholder = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      sources: [],
      isStreaming: true,
      ttftMs: null,
      totalTimeSec: null,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages([...updatedMessages, assistantPlaceholder]);
    setQuestion("");
    setLoading(true);

    const historyPayload = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const startTime = performance.now();
    let firstTokenTime = null;
    let accumulatedContent = "";
    let finalSources = [];

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          department: department || null,
          year: year || null,
          category: category || null,
          institution: institution || null,
          selected_pdfs: selectedPdfs.length > 0 ? selectedPdfs : null,
          conversation_history: historyPayload,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let errData;
        try {
          errData = await res.json();
        } catch {
          errData = {};
        }
        throw new Error(errData.error || `Server responded with status ${res.status}`);
      }

      if (!res.body) {
        throw new Error("No readable response body returned by the server.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith("data:")) continue;

          const jsonStr = trimmedLine.replace(/^data:\s*/, "");
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);

            if (data.type === "token") {
              if (firstTokenTime === null) {
                firstTokenTime = performance.now();
              }
              accumulatedContent += data.content;

              const ttft = firstTokenTime ? Math.round(firstTokenTime - startTime) : null;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        content: accumulatedContent,
                        ttftMs: ttft,
                      }
                    : msg
                )
              );
            } else if (data.type === "done") {
              finalSources = data.sources || [];
              const totalSec = ((performance.now() - startTime) / 1000).toFixed(2);
              const ttft = firstTokenTime ? Math.round(firstTokenTime - startTime) : null;

              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        content: data.answer || accumulatedContent,
                        sources: finalSources,
                        isStreaming: false,
                        ttftMs: ttft,
                        totalTimeSec: totalSec,
                      }
                    : msg
                )
              );
            } else if (data.type === "error") {
              throw new Error(data.error || "Streaming service error");
            }
          } catch (parseErr) {
            console.error("SSE parse error:", parseErr);
          }
        }
      }

      // Mark complete
      const totalSec = ((performance.now() - startTime) / 1000).toFixed(2);
      const ttft = firstTokenTime ? Math.round(firstTokenTime - startTime) : null;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                isStreaming: false,
                sources: msg.sources?.length ? msg.sources : finalSources,
                ttftMs: msg.ttftMs || ttft,
                totalTimeSec: msg.totalTimeSec || totalSec,
              }
            : msg
        )
      );
    } catch (err) {
      if (err.name === "AbortError") {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, isStreaming: false, content: msg.content + " [Generation stopped by user]" }
              : msg
          )
        );
      } else {
        setErrorMsg(err.message || "Failed to retrieve an answer from the academic assistant.");
        setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId || msg.content));
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation */}
      <nav className="border-b border-slate-200 bg-white/95 backdrop-blur-sm sticky top-0 z-30 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-9 h-9 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-lg hover:bg-sky-700 transition-colors shadow-2xs"
            >
              🎓
            </Link>
            <div>
              <Link href="/" className="font-bold text-slate-900 text-sm sm:text-base tracking-tight hover:text-sky-600 transition-colors">
                College RAG
              </Link>
              <span className="text-xs text-slate-500 font-medium hidden sm:inline-block ml-2 border-l border-slate-200 pl-2">
                Multi-Branch Academic Assistant
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearChat}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Reset conversation history"
              >
                <span>🗑️</span>
                <span>New Chat</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                showFilters || selectedPdfs.length > 0 || department || year || category || institution
                  ? "bg-sky-50 text-sky-700 border-sky-300"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>⚙️</span>
              <span>Branch & Filters</span>
              {(department || year || category || institution || selectedPdfs.length > 0) && (
                <span className="w-2 h-2 rounded-full bg-sky-600"></span>
              )}
            </button>

            <Link
              href="/admin"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Admin
            </Link>
          </div>
        </div>
      </nav>

      {/* Slide-Over Filter Drawer (Replaces sticky obstruction with sleek off-canvas drawer) */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity cursor-pointer"
            onClick={() => setShowFilters(false)}
            aria-label="Close filters backdrop"
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-250 border-l border-slate-200">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/90">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⚙️</span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Academic Scope & Filters
                  </h3>
                  <p className="text-xs text-slate-500">
                    Target specific institution, branch, or documents
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer text-sm font-bold"
                title="Close Drawer"
              >
                ✕
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
              {/* Step 1: Institution */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>1. Institution:</span>
                  {institution && (
                    <span className="text-[11px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      {INSTITUTION_META[institution]?.short || institution.toUpperCase()} Active
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setInstitution("");
                      setSelectedPdfs([]);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold text-left transition cursor-pointer border ${
                      !institution
                        ? "bg-purple-700 text-white border-purple-700 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    🏛️ All Institutions
                  </button>
                  {[
                    { id: "dsce", label: "Dayananda Sagar (DSCE)", icon: "🏛️" },
                    { id: "msrit", label: "M.S. Ramaiah (MSRIT)", icon: "🏢" },
                    { id: "ktbs", label: "Karnataka Textbooks (KTBS)", icon: "📖" },
                    { id: "general", label: "General Coursework", icon: "📚" },
                  ].map((instItem) => (
                    <button
                      key={instItem.id}
                      type="button"
                      onClick={() => {
                        setInstitution(instItem.id);
                        setSelectedPdfs([]);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold text-left transition cursor-pointer border flex items-center gap-1.5 ${
                        institution === instItem.id
                          ? "bg-purple-700 text-white border-purple-700 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span>{instItem.icon}</span>
                      <span className="truncate">{instItem.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Branch / Department */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>2. Branch / Department:</span>
                  {department && (
                    <span className="text-[11px] text-sky-700 font-semibold bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                      {department} Active
                    </span>
                  )}
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDepartment("");
                      setSelectedPdfs([]);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                      !department
                        ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    All Branches ({availableDocs.length})
                  </button>
                  {["MCA", "BCA", "CSE", "GENERAL"].map((b) => {
                    const bCount = availableDocs.filter((d) => (d.department || "GENERAL").toUpperCase() === b).length;
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => {
                          setDepartment(b);
                          setSelectedPdfs([]);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                          department === b
                            ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <span>{b}</span>
                        {bCount > 0 && <span className="ml-1 opacity-75 text-[10px]">({bCount})</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Academic Year & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Academic Year
                  </label>
                  <select
                    value={year}
                    onChange={(e) => {
                      setYear(e.target.value);
                      setSelectedPdfs([]);
                    }}
                    disabled={loading}
                    className="w-full text-xs font-medium px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-800"
                  >
                    <option value="">All Years</option>
                    <option value="2024-25">2024-25</option>
                    <option value="2025-26">2025-26</option>
                    <option value="2026-27">2026-27</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Document Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setSelectedPdfs([]);
                    }}
                    disabled={loading}
                    className="w-full text-xs font-medium px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-800"
                  >
                    <option value="">All Categories</option>
                    <option value="syllabus">Syllabus & Scheme</option>
                    <option value="notes">Lecture Notes</option>
                    <option value="lab_manual">Lab Manual</option>
                    <option value="fee">Fee Structure</option>
                    <option value="exam">Exam & Merit List</option>
                    <option value="placement">Placement Records</option>
                    <option value="admission">Admission Guidelines</option>
                  </select>
                </div>
              </div>

              {/* Indexed Documents Checklist */}
              {availableDocs.length > 0 && (
                <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <span>📑</span>
                      <span>Target Documents ({availableDocs.length}):</span>
                    </div>
                    <div className="space-x-2">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-sky-600 hover:underline font-semibold text-xs cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="text-slate-500 hover:underline font-medium text-xs cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    {selectedPdfs.length > 0
                      ? `${selectedPdfs.length} of ${availableDocs.length} PDFs selected to constrain search scope.`
                      : "All indexed documents matching your filter will be searched."}
                  </p>

                  <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
                    {Object.entries(docsByBranchAndCategory).map(([branchName, catGroups]) => (
                      <div key={branchName} className="border border-slate-200 rounded-lg p-2.5 bg-white">
                        <div className="text-xs font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-white text-[10px]">
                            {branchName}
                          </span>
                          <span>Branch Documents</span>
                        </div>

                        <div className="space-y-2 pl-2">
                          {Object.entries(catGroups).map(([catKey, catDocs]) => {
                            const catMeta = CATEGORY_META[catKey] || CATEGORY_META.general;
                            return (
                              <div key={catKey}>
                                <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mb-1">
                                  <span>{catMeta.icon}</span>
                                  <span>{catMeta.name}</span>
                                  <span className="text-[10px] text-slate-400">({catDocs.length})</span>
                                </div>

                                <div className="space-y-1.5 pl-3">
                                  {catDocs.map((doc) => (
                                    <label
                                      key={doc.pdf}
                                      className="flex items-center gap-2 text-xs text-slate-700 hover:text-slate-900 cursor-pointer p-1 rounded hover:bg-slate-50"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedPdfs.includes(doc.pdf)}
                                        onChange={() => handleTogglePdf(doc.pdf)}
                                        className="rounded text-sky-600 cursor-pointer"
                                      />
                                      <span className="truncate flex-1 font-medium">{doc.pdf}</span>
                                      <span className="text-slate-400 text-[10px] shrink-0">({doc.chunks} chunks)</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleClearScope}
                className="text-xs font-semibold text-slate-600 hover:text-red-600 hover:underline cursor-pointer"
              >
                Reset All Filters
              </button>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Apply & View Content ({availableDocs.length} Docs) ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Conversation Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col justify-between">
        {/* Messages List */}
        <div className="space-y-6 mb-36 pb-8">
          {messages.length === 0 ? (
            <div className="max-w-3xl mx-auto space-y-6 py-4">
              {/* Explorer Header */}
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center text-3xl mx-auto shadow-xs">
                  🎓
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Student Academic Knowledge Assistant
                </h2>
                <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
                  Select your institution, branch, and academic year. The assistant immediately indexes the matching syllabus, fee structures, class timetables, and lab manuals for you to explore and query.
                </p>
              </div>

              {/* 3-Step Selection Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                {/* Step 1: Institution */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[11px] font-bold flex items-center justify-center">1</span>
                      Select Institution:
                    </span>
                    {institution && (
                      <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                        {INSTITUTION_META[institution]?.short || institution.toUpperCase()} Selected
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setInstitution("");
                        setSelectedPdfs([]);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        !institution
                          ? "bg-purple-700 text-white shadow-xs"
                          : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      All Institutions
                    </button>
                    {[
                      { id: "dsce", label: "Dayananda Sagar (DSCE)", icon: "🏛️" },
                      { id: "msrit", label: "M.S. Ramaiah (MSRIT)", icon: "🏢" },
                      { id: "ktbs", label: "Karnataka Textbooks (KTBS)", icon: "📖" },
                      { id: "general", label: "General Coursework", icon: "📚" },
                    ].map((instItem) => (
                      <button
                        key={instItem.id}
                        type="button"
                        onClick={() => {
                          setInstitution(instItem.id);
                          setSelectedPdfs([]);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                          institution === instItem.id
                            ? "bg-purple-700 text-white shadow-xs"
                            : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span>{instItem.icon}</span>
                        <span>{instItem.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2: Branch / Department */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[11px] font-bold flex items-center justify-center">2</span>
                      Select Branch / Department:
                    </span>
                    {department && (
                      <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                        {department} Branch Selected
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDepartment("");
                        setSelectedPdfs([]);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        !department
                          ? "bg-sky-600 text-white shadow-xs"
                          : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      All Branches ({availableDocs.length})
                    </button>
                    {["MCA", "BCA", "CSE", "GENERAL"].map((b) => {
                      const count = availableDocs.filter((d) => (d.department || "GENERAL").toUpperCase() === b).length;
                      return (
                        <button
                          key={b}
                          type="button"
                          onClick={() => {
                            setDepartment(b);
                            setSelectedPdfs([]);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                            department === b
                              ? "bg-sky-600 text-white shadow-xs"
                              : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <span>{b}</span>
                          {count > 0 && <span className="opacity-75 text-[10px]">({count})</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 3: Academic Year */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-[11px] font-bold flex items-center justify-center">3</span>
                      Select Academic Year:
                    </span>
                    {year && (
                      <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                        {year} Selected
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {["", "2024-25", "2025-26", "2026-27"].map((y) => (
                      <button
                        key={y || "all"}
                        type="button"
                        onClick={() => {
                          setYear(y);
                          setSelectedPdfs([]);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          year === y
                            ? "bg-teal-700 text-white shadow-xs"
                            : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {y ? y : "All Years"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dynamic Document Results Box based on Chosen Filters */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📑</span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Available Documents for Your Program ({availableDocs.length} Total)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Showing categorized documents matching:{" "}
                        <span className="font-semibold text-slate-700">
                          {institution ? INSTITUTION_META[institution]?.short || institution.toUpperCase() : "All Institutions"}
                        </span>
                        {" • "}
                        <span className="font-semibold text-slate-700">
                          {department || "All Branches"}
                        </span>
                        {" • "}
                        <span className="font-semibold text-slate-700">
                          {year || "All Years"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {availableDocs.length > 0 && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-xs font-semibold text-sky-600 hover:text-sky-800 transition cursor-pointer"
                      >
                        Select All ({availableDocs.length})
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="text-xs font-medium text-slate-500 hover:text-slate-800 transition cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {/* Document List Grouped by Category */}
                {availableDocs.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 p-4">
                    <p className="text-xs font-semibold text-slate-600">
                      No documents found for this filter combination.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Try selecting "All Years" or "All Institutions" to discover available courseware.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                    {Object.entries(docsByBranchAndCategory).map(([branchName, catGroups]) => (
                      <div key={branchName} className="space-y-3">
                        {Object.entries(catGroups).map(([catKey, catDocs]) => {
                          const catMeta = CATEGORY_META[catKey] || CATEGORY_META.general;
                          return (
                            <div key={catKey} className="border border-slate-100 rounded-xl p-3 bg-slate-50/60">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
                                <span className="flex items-center gap-1.5">
                                  <span>{catMeta.icon}</span>
                                  <span>{catMeta.name}</span>
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    ({catDocs.length} document{catDocs.length > 1 ? "s" : ""})
                                  </span>
                                </span>
                                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">
                                  {branchName}
                                </span>
                              </div>

                              <div className="space-y-1.5">
                                {catDocs.map((doc) => {
                                  const isChecked = selectedPdfs.includes(doc.pdf);
                                  return (
                                    <div
                                      key={doc.pdf}
                                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition cursor-pointer ${
                                        isChecked
                                          ? "bg-sky-50/70 border-sky-300 text-slate-900"
                                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                      }`}
                                      onClick={() => handleTogglePdf(doc.pdf)}
                                    >
                                      <div className="flex items-center gap-2.5 truncate mr-2">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => handleTogglePdf(doc.pdf)}
                                          onClick={(e) => e.stopPropagation()}
                                          className="rounded text-sky-600 cursor-pointer"
                                        />
                                        <span className="font-semibold truncate">{doc.pdf}</span>
                                        <span className="text-slate-400 text-[10px] shrink-0 hidden sm:inline">
                                          ({doc.chunks} chunks)
                                        </span>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedPdfs([doc.pdf]);
                                          if (doc.category === "fee") {
                                            setQuestion(`What is the fee structure details in ${doc.pdf}?`);
                                          } else if (doc.category === "syllabus") {
                                            setQuestion(`What are the course details or schedule in ${doc.pdf}?`);
                                          } else if (doc.category === "lab_manual") {
                                            setQuestion(`What are the lab experiments and code in ${doc.pdf}?`);
                                          } else {
                                            setQuestion(`Summarize key academic information from ${doc.pdf}.`);
                                          }
                                        }}
                                        className="shrink-0 text-[10px] font-bold text-sky-700 hover:text-sky-900 bg-sky-100 hover:bg-sky-200 px-2 py-1 rounded-md transition cursor-pointer"
                                      >
                                        🎯 Ask on this PDF
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sample Questions Contextual to Current Selection */}
              <div>
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2.5">
                  Frequently Asked Academic Inquiries:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                  {institution === "msrit" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setQuestion("What is the Govt seat PGCET fee vs Management quota fee for 2nd year MCA at Ramaiah Institute of Technology for 2026-2027?");
                          setInstitution("msrit");
                          setDepartment("MCA");
                          setCategory("fee");
                        }}
                        className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 cursor-pointer transition"
                      >
                        <span className="font-semibold block text-slate-900 mb-0.5">💰 Ramaiah MCA Fee Structure</span>
                        Govt PGCET (₹91,760) vs Management quota (₹3,09,010)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setQuestion("Who is the faculty for 25MCA31 Machine Learning and 25MCAAD5 Generative AI in MCA 3rd semester at Ramaiah?");
                          setInstitution("msrit");
                          setDepartment("MCA");
                          setCategory("syllabus");
                        }}
                        className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 cursor-pointer transition"
                      >
                        <span className="font-semibold block text-slate-900 mb-0.5">🕒 Ramaiah Faculty & Timetable</span>
                        Faculty allocation for ML and Generative AI courses
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setQuestion("What is the classroom time table schedule for MCA 3rd semester on Monday and Wednesday?");
                          setInstitution("msrit");
                          setDepartment("MCA");
                          setCategory("syllabus");
                        }}
                        className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 cursor-pointer transition"
                      >
                        <span className="font-semibold block text-slate-900 mb-0.5">📅 Weekly Timetable Schedule</span>
                        Daily period slots, break times, and lab sessions
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setQuestion("What are the course objectives and credits for 25MCA31 Machine Learning at MSRIT?");
                          setInstitution("msrit");
                          setDepartment("MCA");
                          setCategory("syllabus");
                        }}
                        className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 cursor-pointer transition"
                      >
                        <span className="font-semibold block text-slate-900 mb-0.5">📘 MSRIT MCA Syllabus</span>
                        Course credits, units, and evaluation criteria
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setQuestion("What is the total annual fee for Karnataka PGCET quota vs Management quota for MCA at DSCE?");
                          setInstitution("dsce");
                          setDepartment("MCA");
                          setCategory("fee");
                        }}
                        className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 cursor-pointer transition"
                      >
                        <span className="font-semibold block text-slate-900 mb-0.5">💰 DSCE Fee Structure</span>
                        Compare PGCET vs Management quota fees
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setQuestion("List the top 5 students in the MCA semester rank list.");
                          setInstitution("dsce");
                          setDepartment("MCA");
                          setCategory("exam");
                        }}
                        className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 cursor-pointer transition"
                      >
                        <span className="font-semibold block text-slate-900 mb-0.5">🏆 MCA Merit List</span>
                        Top rank holders, CGPAs, and distinctions
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setQuestion("Show me the Binary Search Tree implementation in Python from the lab manual.");
                          setInstitution("dsce");
                          setDepartment("MCA");
                          setCategory("lab_manual");
                        }}
                        className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 cursor-pointer transition"
                      >
                        <span className="font-semibold block text-slate-900 mb-0.5">💻 Python Lab Manual</span>
                        BST insertion and traversal algorithms
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setQuestion("What is Experiment 1 in the BCA Web Programming lab manual?");
                          setInstitution("dsce");
                          setDepartment("BCA");
                          setCategory("lab_manual");
                        }}
                        className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 cursor-pointer transition"
                      >
                        <span className="font-semibold block text-slate-900 mb-0.5">🌐 BCA Lab Manual</span>
                        Responsive web page with CSS Grid and flexbox
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === "user";

              if (isUser) {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 bg-sky-600 text-white shadow-xs text-sm sm:text-base">
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                );
              }

              const groupedSources = groupSources(msg.sources);

              return (
                <div key={msg.id} className="flex gap-3 text-slate-900">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-1 shadow-2xs">
                    🎓
                  </div>

                  <div className="flex-1 space-y-3 max-w-full overflow-hidden">
                    {/* Performance Metrics Header */}
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 border-b border-slate-200 pb-1.5">
                      <span className="font-semibold text-slate-700">💡 Grounded Academic Response</span>
                      {msg.ttftMs && <span>&bull; TTFT: {msg.ttftMs}ms</span>}
                      {msg.totalTimeSec && <span>&bull; Total: {msg.totalTimeSec}s</span>}
                      {msg.isStreaming && (
                        <span className="text-sky-600 font-medium animate-pulse ml-auto flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-600 animate-ping"></span>
                          Generating...
                        </span>
                      )}
                    </div>

                    {/* Markdown Answer Body */}
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs prose prose-slate max-w-none text-sm sm:text-base leading-relaxed">
                      {msg.content ? (
                        <MarkdownRenderer content={msg.content} />
                      ) : (
                        <div className="flex items-center gap-2 text-slate-400 py-2">
                          <span className="w-2 h-2 rounded-full bg-sky-600 animate-pulse"></span>
                          <span className="text-xs">Searching documents and generating grounded answer...</span>
                        </div>
                      )}
                    </div>

                    {/* Verified Citations List */}
                    {groupedSources.length > 0 && (
                      <div className="bg-slate-100/80 rounded-xl p-3 border border-slate-200 text-xs">
                        <div className="font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                          <span>📚</span>
                          <span>Verified Source Citations</span>
                        </div>
                        <div className="space-y-2">
                          {groupedSources.map((item, idx) => (
                            <div key={idx} className="flex flex-wrap items-center justify-between gap-1 text-slate-600 bg-white p-2 rounded-lg border border-slate-200/80">
                              <span className="font-semibold text-slate-800 truncate max-w-xs sm:max-w-md">
                                📄 {item.pdf}
                              </span>
                              <div className="flex items-center gap-1 flex-wrap">
                                {item.pages.length > 0 ? (
                                  item.pages.map((p) => (
                                    <button
                                      key={p}
                                      type="button"
                                      onClick={() => openPdfViewer(item.pdf, p)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold text-xs transition-colors cursor-pointer"
                                      title={`View page ${p} of ${item.pdf}`}
                                    >
                                      <span>Page {p}</span>
                                      <span className="text-[10px]">↗</span>
                                    </button>
                                  ))
                                ) : (
                                  <span className="text-slate-400">(page unreferenced)</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg("")}
              className="text-red-500 hover:text-red-700 font-bold text-xs cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Input Bar Fixed Container */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3.5 z-20 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            {/* Active Search Scope Indicator */}
            {(institution || department || year || category || selectedPdfs.length > 0) && (
              <div className="flex items-center justify-between text-xs mb-2 px-3 py-1.5 bg-sky-50 border border-sky-200 rounded-lg text-slate-700">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-sky-900">🎯 Active Search Scope:</span>
                  {institution && (
                    <span className="px-2 py-0.5 rounded bg-purple-700 text-white font-bold text-[11px]">
                      🏛️ {INSTITUTION_META[institution]?.short || institution.toUpperCase()}
                    </span>
                  )}
                  {department && (
                    <span className="px-2 py-0.5 rounded bg-sky-600 text-white font-bold text-[11px]">
                      Branch: {department}
                    </span>
                  )}
                  {year && (
                    <span className="px-2 py-0.5 rounded bg-teal-700 text-white font-medium text-[11px]">
                      Year: {year}
                    </span>
                  )}
                  {category && (
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-white font-medium text-[11px]">
                      Category: {CATEGORY_META[category]?.name || category}
                    </span>
                  )}
                  {selectedPdfs.length > 0 && (
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium text-[11px] border border-amber-300">
                      📑 {selectedPdfs.length} Doc(s) selected
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFilters(true)}
                    className="text-sky-700 hover:underline font-semibold text-[11px] cursor-pointer"
                  >
                    Change Scope
                  </button>
                  <button
                    type="button"
                    onClick={handleClearScope}
                    className="text-slate-500 hover:text-red-600 font-semibold text-[11px] underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleAsk} className="flex items-center gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={loading}
                placeholder={
                  department
                    ? `Ask questions within ${department} branch (${category || "all categories"})...`
                    : "Ask about courses, syllabi, fee structures, or lab manuals..."
                }
                className="flex-1 px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 shadow-2xs"
              />

              {loading ? (
                <button
                  type="button"
                  onClick={handleStopGenerating}
                  className="px-4 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <span>⏹</span>
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!question.trim()}
                  className="px-5 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <span>Ask</span>
                  <span>→</span>
                </button>
              )}
            </form>
          </div>
        </div>
      </main>

      {/* PDF Viewer Modal Component */}
      <PdfViewerModal
        isOpen={pdfModal.isOpen}
        pdf={pdfModal.pdf}
        page={pdfModal.page}
        onClose={() => setPdfModal({ isOpen: false, pdf: "", page: 1 })}
      />
    </div>
  );
}
