"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const CATEGORY_META = {
  syllabus: { name: "Syllabus & Scheme", icon: "📘", bg: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  notes: { name: "Lecture Notes", icon: "📝", bg: "bg-blue-50 text-blue-700 border-blue-200" },
  lab_manual: { name: "Lab Manual", icon: "💻", bg: "bg-teal-50 text-teal-700 border-teal-200" },
  fee: { name: "Fee Structure", icon: "💰", bg: "bg-amber-50 text-amber-700 border-amber-200" },
  exam: { name: "Exam & Merit List", icon: "🏆", bg: "bg-rose-50 text-rose-700 border-rose-200" },
  placement: { name: "Placement Records", icon: "💼", bg: "bg-yellow-50 text-yellow-800 border-yellow-200" },
  admission: { name: "Admission Guidelines", icon: "🎓", bg: "bg-violet-50 text-violet-700 border-violet-200" },
  general: { name: "General / Other", icon: "📄", bg: "bg-slate-50 text-slate-700 border-slate-200" },
};

const DEPARTMENT_BADGES = {
  MCA: "bg-indigo-50 text-indigo-700 border-indigo-200",
  BCA: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CSE: "bg-purple-50 text-purple-700 border-purple-200",
  ECE: "bg-sky-50 text-sky-700 border-sky-200",
  MBA: "bg-amber-50 text-amber-700 border-amber-200",
  GENERAL: "bg-slate-100 text-slate-700 border-slate-300",
};

export default function AdminPage() {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Form states
  const [institution, setInstitution] = useState("dsce");
  const [category, setCategory] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("info"); // 'info' | 'success' | 'error'
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Async Ingestion Polling State
  const [uploadJobId, setUploadJobId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Inventory & Filter states
  const [documents, setDocuments] = useState([]);
  const [hierarchyInfo, setHierarchyInfo] = useState({
    branchesCount: 0,
    categoriesCount: 0,
    totalChunks: 0,
    branchesSummary: [],
  });
  const [selectedInstitutionFilter, setSelectedInstitutionFilter] = useState("ALL");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("ALL");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [searchFilter, setSearchFilter] = useState("");
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docsError, setDocsError] = useState("");

  // Question Analytics states
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [showRepeatedOnly, setShowRepeatedOnly] = useState(false);

  // Deletion modal & preview state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetForDelete, setTargetForDelete] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deleteActionLoading, setDeleteActionLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Replacement modal state
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [targetForReplace, setTargetForReplace] = useState(null);
  const [replaceFile, setReplaceFile] = useState(null);
  const [replaceDept, setReplaceDept] = useState("");
  const [replaceYear, setReplaceYear] = useState("");
  const [replaceCategory, setReplaceCategory] = useState("");
  const [replaceLoading, setReplaceLoading] = useState(false);
  const [replaceError, setReplaceError] = useState("");

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    setCheckingAuth(true);
    try {
      const res = await fetch("/api/admin/session");
      const data = await res.json();
      if (res.ok && data.authenticated) {
        setIsAuthenticated(true);
        fetchDocuments();
        fetchAnalytics();
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      setCheckingAuth(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!passwordInput.trim() || authLoading) return;

    setAuthLoading(true);
    setAuthError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setPasswordInput("");
        fetchDocuments();
        fetchAnalytics();
      } else {
        setAuthError(data.error || "Authentication failed: Invalid administrator passcode.");
      }
    } catch (err) {
      setAuthError(`Network error: ${err.message}`);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      setIsAuthenticated(false);
      setStatus("You have been signed out successfully.");
      setStatusType("info");
    }
  }

  async function fetchDocuments() {
    setLoadingDocs(true);
    setDocsError("");
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (res.ok && data.success) {
        setDocuments(data.documents || []);
        setHierarchyInfo({
          branchesCount: data.branches_count || 0,
          categoriesCount: data.categories_count || 0,
          totalChunks: data.total_chunks || 0,
          branchesSummary: data.branches_summary || [],
        });
      } else {
        setDocsError(data.error || "Failed to fetch indexed documents");
      }
    } catch (err) {
      setDocsError(err.message || "Failed to load indexed documents");
    } finally {
      setLoadingDocs(false);
    }
  }

  async function fetchAnalytics() {
    setLoadingAnalytics(true);
    setAnalyticsError("");
    try {
      const res = await fetch("/api/admin/analytics", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.success) {
        setAnalyticsData(data);
      } else if (res.status !== 401 && res.status !== 403) {
        setAnalyticsError(data.error || "Failed to fetch question analytics");
      }
    } catch (err) {
      setAnalyticsError(err.message || "Failed to load question analytics");
    } finally {
      setLoadingAnalytics(false);
    }
  }

  async function handleClearAnalytics() {
    try {
      const res = await fetch("/api/admin/analytics", { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchAnalytics();
      } else {
        setAnalyticsError(data.error || "Failed to reset question analytics");
      }
    } catch (err) {
      setAnalyticsError(err.message || "Failed to reset question analytics");
    }
  }

  function handleFileDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = e.dataTransfer.files[0];
      if (dropped.type === "application/pdf" || dropped.name.toLowerCase().endsWith(".pdf")) {
        setFile(dropped);
      } else {
        setStatus("Only PDF documents (.pdf) are supported.");
        setStatusType("error");
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!category || !department || !year || !institution || !file) {
      setStatus("Please specify the Target Institution, Department, Academic Year, Category, and select a PDF document.");
      setStatusType("error");
      return;
    }

    setStatus("Uploading document to academic ingestion pipeline...");
    setStatusType("info");
    setIsUploading(true);
    setUploadProgress(10);
    setUploadStage("uploading");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("institution", institution);
    formData.append("category", category);
    formData.append("department", department);
    formData.append("year", year);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.status === 401 || response.status === 403) {
        setIsAuthenticated(false);
        setAuthError("Session expired or unauthorized. Please re-authenticate.");
        setIsUploading(false);
        return;
      }

      if (response.ok && result.job_id) {
        setUploadJobId(result.job_id);
        setStatus("Upload received. Background parser executing...");
        setStatusType("info");
        setUploadStage(result.status || "queued");
        setUploadProgress(20);
        pollJobStatus(result.job_id);
      } else if (response.ok) {
        setStatus(result.message || "Document successfully indexed.");
        setStatusType("success");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setIsUploading(false);
        fetchDocuments();
      } else {
        setStatus(`Upload failed: ${result.error}`);
        setStatusType("error");
        setIsUploading(false);
      }
    } catch (error) {
      setStatus(`Upload failed: ${error.message}`);
      setStatusType("error");
      setIsUploading(false);
    }
  }

  async function pollJobStatus(jobId) {
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/upload/status/${encodeURIComponent(jobId)}`);
        if (!res.ok) {
          clearInterval(pollInterval);
          setIsUploading(false);
          const errData = await res.json().catch(() => ({}));
          setStatus(`Status check failed: ${errData.error || res.statusText}`);
          setStatusType("error");
          return;
        }

        const data = await res.json();
        setUploadProgress(data.progress || 0);
        setUploadStage(data.stage || data.status || "");

        if (data.status === "completed") {
          clearInterval(pollInterval);
          setIsUploading(false);
          setUploadProgress(100);
          const isDup = data.result?.status === "duplicate";
          const added = data.chunks_added ?? data.result?.chunks_added ?? 0;
          const total = data.total_chunks ?? data.result?.total_chunks ?? 0;
          if (isDup) {
            setStatus(`${data.filename} is already indexed (${total} total chunks preserved in corpus).`);
            setStatusType("info");
          } else {
            setStatus(`Successfully indexed ${data.filename} (+${added} chunks added, ${total} total in knowledge base).`);
            setStatusType("success");
          }
          setFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          fetchDocuments();
        } else if (data.status === "failed") {
          clearInterval(pollInterval);
          setIsUploading(false);
          setStatus(`Ingestion failed: ${data.error || "Unknown worker error"}`);
          setStatusType("error");
        }
      } catch (err) {
        clearInterval(pollInterval);
        setIsUploading(false);
        setStatus(`Polling error: ${err.message}`);
        setStatusType("error");
      }
    }, 1000);
  }

  // Preview deletion
  async function handleOpenDelete(doc) {
    setTargetForDelete(doc);
    setDeleteModalOpen(true);
    setPreviewLoading(true);
    setDeleteError("");
    setPreviewData(null);

    try {
      const res = await fetch("/api/documents/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_pdf: doc.pdf,
          doc_hash: doc.doc_hash,
          doc_id: doc.doc_id,
          department: doc.department,
          year: doc.year,
          category: doc.category,
        }),
      });

      if (res.status === 401 || res.status === 403) {
        setIsAuthenticated(false);
        setDeleteModalOpen(false);
        setAuthError("Session expired. Please log in again.");
        return;
      }

      const data = await res.json();
      if (res.ok && data.success) {
        setPreviewData(data);
      } else {
        setDeleteError(data.error || "Failed to generate deletion preview.");
      }
    } catch (err) {
      setDeleteError(err.message || "Network error loading preview.");
    } finally {
      setPreviewLoading(false);
    }
  }

  // Execute deletion
  async function handleConfirmDelete() {
    if (!targetForDelete) return;

    setDeleteActionLoading(true);
    setDeleteError("");

    try {
      const res = await fetch("/api/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_pdf: targetForDelete.pdf,
          doc_hash: targetForDelete.doc_hash,
          doc_id: targetForDelete.doc_id,
          department: targetForDelete.department,
          year: targetForDelete.year,
          category: targetForDelete.category,
          confirm: true,
        }),
      });

      if (res.status === 401 || res.status === 403) {
        setIsAuthenticated(false);
        setDeleteModalOpen(false);
        setAuthError("Session expired. Please log in again.");
        return;
      }

      const data = await res.json();
      if (res.ok && data.success) {
        setStatus(`Document removed: ${data.message}`);
        setStatusType("info");
        setDeleteModalOpen(false);
        setTargetForDelete(null);
        fetchDocuments();
      } else {
        setDeleteError(data.error || "Deletion failed.");
      }
    } catch (err) {
      setDeleteError(err.message || "Failed to communicate with deletion service.");
    } finally {
      setDeleteActionLoading(false);
    }
  }

  // Open replace modal
  function handleOpenReplace(doc) {
    setTargetForReplace(doc);
    setReplaceDept(doc.department || "");
    setReplaceYear(doc.year || "");
    setReplaceCategory(doc.category || "");
    setReplaceFile(null);
    setReplaceError("");
    setReplaceModalOpen(true);
  }

  // Execute replace
  async function handleConfirmReplace(e) {
    e.preventDefault();
    if (!targetForReplace || !replaceFile) {
      setReplaceError("Please select a replacement PDF file.");
      return;
    }

    setReplaceLoading(true);
    setReplaceError("");

    const formData = new FormData();
    formData.append("file", replaceFile);
    formData.append("target_pdf", targetForReplace.pdf);
    if (targetForReplace.doc_hash) formData.append("target_hash", targetForReplace.doc_hash);
    if (targetForReplace.doc_id) formData.append("target_id", targetForReplace.doc_id);
    if (replaceDept) formData.append("department", replaceDept);
    if (replaceYear) formData.append("year", replaceYear);
    if (replaceCategory) formData.append("category", replaceCategory);

    try {
      const res = await fetch("/api/documents/replace", {
        method: "POST",
        body: formData,
      });

      if (res.status === 401 || res.status === 403) {
        setIsAuthenticated(false);
        setReplaceModalOpen(false);
        setAuthError("Session expired. Please log in again.");
        return;
      }

      const data = await res.json();
      if (res.ok && data.success) {
        setStatus(`Document replaced: ${data.message}`);
        setStatusType("success");
        setReplaceModalOpen(false);
        setTargetForReplace(null);
        setReplaceFile(null);
        fetchDocuments();
      } else {
        setReplaceError(data.error || "Replacement failed.");
      }
    } catch (err) {
      setReplaceError(err.message || "Network error during replacement.");
    } finally {
      setReplaceLoading(false);
    }
  }

  // Active branch information for breakdown display
  const activeBranchData = hierarchyInfo.branchesSummary?.find(
    (b) => b.branch.toUpperCase() === selectedBranchFilter.toUpperCase()
  );

  // Filtered documents list
  const filteredDocuments = documents.filter((doc) => {
    // Institution filter
    if (selectedInstitutionFilter !== "ALL") {
      const docInst = (doc.institution || "dsce").toLowerCase();
      if (docInst !== selectedInstitutionFilter.toLowerCase()) return false;
    }
    // Branch filter
    if (selectedBranchFilter !== "ALL") {
      const docDept = (doc.department || "GENERAL").toUpperCase();
      if (docDept !== selectedBranchFilter.toUpperCase()) return false;
    }
    // Category filter
    if (selectedCategoryFilter !== "ALL") {
      const docCat = (doc.category || "general").toLowerCase();
      if (docCat !== selectedCategoryFilter.toLowerCase()) return false;
    }
    // Search filter
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      const name = (doc.pdf || "").toLowerCase();
      const dept = (doc.department || "").toLowerCase();
      const cat = (doc.category || "").toLowerCase();
      const yr = (doc.year || "").toLowerCase();
      if (!name.includes(q) && !dept.includes(q) && !cat.includes(q) && !yr.includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Loading Session State
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Verifying administrator session...</p>
        </div>
      </div>
    );
  }

  // Render Login Screen if not authenticated (Clean Light Dashboard Theme)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-sky-600 text-white flex items-center justify-center text-2xl shadow-md shadow-sky-500/20 mb-4">
              🔐
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Administrator Portal
            </h2>
            <p className="text-sm text-slate-500 mt-1.5">
              Knowledge base management & document ingestion require administrative authorization.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Admin Passcode or API Key
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter ADMIN_API_KEY"
                required
                className="w-full px-4 py-3 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none transition"
              />
            </div>

            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-700 flex items-center gap-2">
                <span>⚠️</span> {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading || !passwordInput.trim()}
              className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-sm active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {authLoading ? "Authenticating..." : "Unlock Dashboard"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <Link
              href="/ask"
              className="text-xs font-semibold text-slate-600 hover:text-sky-600 transition inline-flex items-center gap-1.5"
            >
              <span>←</span> Return to Student Academic Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Render Full Light-Themed Dashboard (matching previous dashboard style & student portal)
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      {/* Top App Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              🎓
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-slate-900">
                  College RAG
                </span>
                <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  Admin Console
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Academic Document Operations & Vector Ingestion
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/ask"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-xs hover:bg-slate-50 transition"
            >
              <span>🔍</span>
              <span className="hidden sm:inline">Student Portal</span>
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Indexed Documents</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{documents.length}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Active catalog files</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center text-xl">
              📄
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Academic Branches</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{hierarchyInfo.branchesCount || 4}</h3>
              <p className="text-xs text-slate-400 mt-0.5">MCA, BCA, CSE, GENERAL</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
              🏛️
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Categories</p>
              <h3 className="text-2xl font-bold text-purple-600 mt-1">{hierarchyInfo.categoriesCount || 7}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Scheme, Notes, Fees, Lab</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl">
              🏷️
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vector Chunks</p>
              <h3 className="text-2xl font-bold text-indigo-600 mt-1">{hierarchyInfo.totalChunks || 944}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Dense 384-d embeddings</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl">
              ⚡
            </div>
          </div>
        </div>

        {/* Upload & Ingestion Card */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 mb-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>📥</span> Ingest New Academic Document
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload syllabus schemes, lecture notes, lab manuals, or circulars for automated tabular chunking & vector indexing.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-[11px] font-semibold text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Async Ingestion Ready
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Target Institution <span className="text-rose-500">*</span>
                </label>
                <select
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="dsce">Dayananda Sagar (DSCE)</option>
                  <option value="msrit">M.S. Ramaiah (MSRIT)</option>
                  <option value="ktbs">Karnataka Textbook Society (KTBS)</option>
                  <option value="general">General / Academic Coursework</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Academic Branch <span className="text-rose-500">*</span>
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="">-- Select Department --</option>
                  <option value="MCA">MCA (Master of Computer Applications)</option>
                  <option value="BCA">BCA (Bachelor of Computer Applications)</option>
                  <option value="CSE">CSE (Computer Science & Engineering)</option>
                  <option value="ECE">ECE (Electronics & Communication)</option>
                  <option value="MBA">MBA (Master of Business Admin)</option>
                  <option value="GENERAL">GENERAL (Institution-wide)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Academic Year <span className="text-rose-500">*</span>
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="">-- Select Year --</option>
                  <option value="2024-25">2024-25</option>
                  <option value="2025-26">2025-26</option>
                  <option value="2026-27">2026-27</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Content Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="">-- Select Category --</option>
                  <option value="syllabus">📘 Syllabus & Scheme</option>
                  <option value="notes">📝 Lecture Notes</option>
                  <option value="lab_manual">💻 Lab Manual</option>
                  <option value="fee">💰 Fee Structure</option>
                  <option value="exam">🏆 Exam & Rank List</option>
                  <option value="placement">💼 Placement Records</option>
                  <option value="admission">🎓 Admission Guidelines</option>
                  <option value="general">📄 General / Other</option>
                </select>
              </div>
            </div>

            {/* Drag & Drop PDF Dropzone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                PDF Document <span className="text-rose-500">*</span>
              </label>

              {!file ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition ${
                    isDragging
                      ? "border-sky-500 bg-sky-50/50"
                      : "border-slate-300 hover:border-sky-500 bg-slate-50/70"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center text-2xl">
                      📄
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Click to browse or drag & drop PDF here
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Maximum file size: 25 MB • Verified with %PDF- header integrity check
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-sky-50 border border-sky-200 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center text-xl font-bold">
                      PDF
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{file.name}</p>
                      <p className="text-xs text-sky-700">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for ingestion
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 rounded-xl transition cursor-pointer"
                  >
                    Change File
                  </button>
                </div>
              )}
            </div>

            {/* Ingestion Progress Bar */}
            {isUploading && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-sky-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-600 animate-ping" />
                    Stage: {uploadStage || "Processing"}
                  </span>
                  <span className="text-slate-700">{uploadProgress}%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-600 transition-all duration-300 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Status Feedback Banner */}
            {status && (
              <div
                className={`p-4 rounded-2xl text-xs font-medium flex items-center gap-2.5 ${
                  statusType === "success"
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                    : statusType === "error"
                    ? "bg-rose-50 border border-rose-200 text-rose-800"
                    : "bg-blue-50 border border-blue-200 text-blue-800"
                }`}
              >
                <span>{statusType === "success" ? "✅" : statusType === "error" ? "❌" : "ℹ️"}</span>
                <span>{status}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isUploading}
                className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm rounded-xl shadow-xs active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing Ingestion...</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>Upload & Index Document</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Document Inventory Section - Indexed Documents by Branch & Category */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>📚</span> Indexed Documents by Branch & Category ({documents.length} total)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Current inventory of all active PDF documents, chunk counts, and departmental taxonomy.
              </p>
            </div>

            <button
              onClick={fetchDocuments}
              disabled={loadingDocs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer self-start sm:self-auto"
            >
              <span>{loadingDocs ? "⏳" : "🔄"}</span>
              <span>{loadingDocs ? "Refreshing..." : "Refresh Catalog"}</span>
            </button>
          </div>

          {/* Branch & Category Filter Toolbar - Replaces previous tab/slider bar with Dropdowns */}
          <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl mb-5 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Institution Dropdown */}
                <div className="flex items-center gap-2">
                  <label htmlFor="inst-filter-select" className="text-xs font-bold text-slate-700 whitespace-nowrap">
                    Institution:
                  </label>
                  <select
                    id="inst-filter-select"
                    value={selectedInstitutionFilter}
                    onChange={(e) => setSelectedInstitutionFilter(e.target.value)}
                    className="px-3 py-2 text-xs font-semibold bg-white text-slate-800 border border-slate-300 rounded-xl shadow-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="ALL">All Institutions</option>
                    <option value="dsce">Dayananda Sagar (DSCE)</option>
                    <option value="msrit">M.S. Ramaiah (MSRIT)</option>
                    <option value="ktbs">Karnataka Textbook Society (KTBS)</option>
                    <option value="general">General / Coursework</option>
                  </select>
                </div>

                {/* Branch Dropdown */}
                <div className="flex items-center gap-2">
                  <label htmlFor="branch-filter-select" className="text-xs font-bold text-slate-700 whitespace-nowrap">
                    Branch:
                  </label>
                  <select
                    id="branch-filter-select"
                    value={selectedBranchFilter}
                    onChange={(e) => setSelectedBranchFilter(e.target.value)}
                    className="px-3 py-2 text-xs font-semibold bg-white text-slate-800 border border-slate-300 rounded-xl shadow-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="ALL">All Branches ({documents.length} docs)</option>
                    {hierarchyInfo.branchesSummary &&
                      hierarchyInfo.branchesSummary.map((b) => (
                        <option key={b.branch} value={b.branch}>
                          {b.branch} ({b.document_count} doc{b.document_count > 1 ? "s" : ""}, {b.chunk_count} chunks)
                        </option>
                      ))}
                  </select>
                </div>

                {/* Category Dropdown */}
                <div className="flex items-center gap-2">
                  <label htmlFor="category-filter-select" className="text-xs font-bold text-slate-700 whitespace-nowrap">
                    Category:
                  </label>
                  <select
                    id="category-filter-select"
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="px-3 py-2 text-xs font-semibold bg-white text-slate-800 border border-slate-300 rounded-xl shadow-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="syllabus">📘 Syllabus & Scheme</option>
                    <option value="notes">📝 Lecture Notes</option>
                    <option value="lab_manual">💻 Lab Manual</option>
                    <option value="fee">💰 Fee Structure</option>
                    <option value="exam">🏆 Exam & Rank List</option>
                    <option value="placement">💼 Placement Records</option>
                    <option value="admission">🎓 Admission Guidelines</option>
                    <option value="general">📄 General / Other</option>
                  </select>
                </div>

                {/* Reset Filters button */}
                {(selectedInstitutionFilter !== "ALL" || selectedBranchFilter !== "ALL" || selectedCategoryFilter !== "ALL" || searchFilter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInstitutionFilter("ALL");
                      setSelectedBranchFilter("ALL");
                      setSelectedCategoryFilter("ALL");
                      setSearchFilter("");
                    }}
                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer underline ml-1"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              {/* Keyword Search Input */}
              <div className="w-full md:w-64">
                <input
                  type="text"
                  placeholder="Search document name or year..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white text-slate-800 placeholder:text-slate-400 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Branch and Category Breakdown Summary Pills */}
            <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
              <span className="font-bold text-slate-700 mr-1">Distribution:</span>
              {activeBranchData ? (
                activeBranchData.categories && activeBranchData.categories.length > 0 ? (
                  activeBranchData.categories.map((c) => (
                    <span
                      key={c.category}
                      className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium"
                    >
                      {CATEGORY_META[c.category]?.icon || "📄"} {c.category_name}: <strong>{c.count}</strong> ({c.chunks} chunks)
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400">No categories indexed under {activeBranchData.branch}</span>
                )
              ) : (
                hierarchyInfo.branchesSummary &&
                hierarchyInfo.branchesSummary.map((b) => (
                  <span
                    key={b.branch}
                    className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium"
                  >
                    🏛️ <strong>{b.branch}</strong>: {b.document_count} doc{b.document_count > 1 ? "s" : ""} ({b.chunk_count} chunks)
                  </span>
                ))
              )}
            </div>
          </div>

          {loadingDocs && (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-3 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
              <p className="text-xs text-slate-500">Loading document repository...</p>
            </div>
          )}

          {docsError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              ❌ {docsError}
            </div>
          )}

          {!loadingDocs && filteredDocuments.length === 0 && !docsError && (
            <div className="py-12 text-center text-slate-400 text-sm">
              No documents found matching the active branch, category, or search criteria.
            </div>
          )}

          {!loadingDocs && filteredDocuments.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Document File</th>
                    <th className="py-3 px-4">Institution</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Academic Year</th>
                    <th className="py-3 px-4">Chunks</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDocuments.map((doc, idx) => {
                    const deptKey = (doc.department || "GENERAL").toUpperCase();
                    const deptStyle = DEPARTMENT_BADGES[deptKey] || DEPARTMENT_BADGES.GENERAL;
                    const catMeta = CATEGORY_META[doc.category] || CATEGORY_META.general;
                    const instLower = (doc.institution || "dsce").toLowerCase();

                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>📄</span>
                            <span className="truncate max-w-xs">{doc.pdf}</span>
                            {doc.is_legacy && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-slate-100 text-slate-500 border border-slate-200">
                                legacy
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${
                              instLower === "msrit"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : instLower === "ktbs"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : instLower === "general"
                                ? "bg-slate-100 text-slate-700 border-slate-200"
                                : "bg-sky-50 text-sky-700 border-sky-200"
                            }`}
                          >
                            {instLower.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border ${deptStyle}`}>
                            {doc.department || "GENERAL"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border ${catMeta.bg}`}>
                            {catMeta.icon} {catMeta.name}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {doc.year || "—"}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-700">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[11px]">
                            {doc.chunks} chunks
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 capitalize">
                          {doc.doc_type || "standard"}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenReplace(doc)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition cursor-pointer"
                            >
                              Replace
                            </button>
                            <button
                              onClick={() => handleOpenDelete(doc)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 transition cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Student Question Analytics & Most Repeatedly Asked Questions */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>📊</span> Most Repeatedly Asked Questions &amp; Student Inquiry Areas
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Track which questions students repeat most often and which academic areas (Fees, Syllabus, Timetables, Labs) generate the highest demand.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={fetchAnalytics}
                disabled={loadingAnalytics}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
              >
                <span>{loadingAnalytics ? "⏳" : "🔄"}</span>
                <span>{loadingAnalytics ? "Loading..." : "Refresh Insights"}</span>
              </button>
              {analyticsData && analyticsData.total_queries > 0 && (
                <button
                  type="button"
                  onClick={handleClearAnalytics}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer"
                >
                  <span>🗑️</span>
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {analyticsError && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              ❌ {analyticsError}
            </div>
          )}

          {/* Quick Summary Strip */}
          {analyticsData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200">
                <p className="text-[11px] font-bold text-sky-800 uppercase tracking-wider">Total Student Queries</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{analyticsData.total_queries || 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200">
                <p className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">Unique Questions</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{analyticsData.unique_questions || 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Repeated Questions (2+ Asks)</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{analyticsData.repeated_questions_count || 0}</p>
              </div>
            </div>
          )}

          {!analyticsData || (analyticsData.top_questions || []).length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-500">
              No student questions logged yet. As soon as students ask questions on the Assistant page, the most frequently asked topics and repeated questions will appear here.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Topic / Area Breakdown */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🎯</span> Top Inquiry Areas
                </h3>
                <div className="space-y-3">
                  {(analyticsData.area_breakdown || []).map((areaItem) => {
                    const meta = CATEGORY_META[areaItem.area] || (
                      areaItem.area === "timetable"
                        ? { name: "Timetable & Faculty", icon: "📅" }
                        : CATEGORY_META.general
                    );
                    return (
                      <div key={areaItem.area} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                            <span>{meta.icon}</span>
                            <span>{meta.name}</span>
                          </span>
                          <span className="font-bold text-slate-900">
                            {areaItem.count} ({areaItem.percentage}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-600 rounded-full transition-all"
                            style={{ width: `${Math.min(100, areaItem.percentage)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Ranked Repeated Questions Table */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🔥</span> Most Repeatedly Asked Questions
                  </h3>
                  <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showRepeatedOnly}
                      onChange={(e) => setShowRepeatedOnly(e.target.checked)}
                      className="rounded text-sky-600 cursor-pointer"
                    />
                    <span>Show repeated only (2+)</span>
                  </label>
                </div>

                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {(analyticsData.top_questions || [])
                    .filter((q) => !showRepeatedOnly || q.count >= 2)
                    .map((qItem, idx) => {
                      const areaMeta = CATEGORY_META[qItem.primary_area] || (
                        qItem.primary_area === "timetable"
                          ? { name: "Timetable & Faculty", icon: "📅", bg: "bg-cyan-50 text-cyan-800 border-cyan-200" }
                          : CATEGORY_META.general
                      );
                      return (
                        <div
                          key={qItem.id || idx}
                          className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-sky-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <span
                              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                idx === 0
                                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                                  : idx === 1
                                  ? "bg-slate-200 text-slate-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              #{idx + 1}
                            </span>
                            <div className="min-w-0 space-y-1">
                              <p className="text-sm font-semibold text-slate-900 break-words">
                                {qItem.question}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                <span className={`px-2 py-0.5 rounded border font-semibold ${areaMeta.bg || "bg-slate-50 text-slate-700 border-slate-200"}`}>
                                  {areaMeta.icon} {areaMeta.name}
                                </span>
                                {qItem.primary_institution && qItem.primary_institution !== "all" && (
                                  <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-semibold uppercase">
                                    🏛️ {qItem.primary_institution}
                                  </span>
                                )}
                                {qItem.primary_department && qItem.primary_department !== "ALL" && (
                                  <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                                    {qItem.primary_department}
                                  </span>
                                )}
                                {qItem.last_asked_at && (
                                  <span className="text-slate-400">
                                    Last asked: {new Date(qItem.last_asked_at).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                qItem.count >= 3
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : qItem.count >= 2
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              {qItem.count >= 2 ? `🔥 Asked ${qItem.count}×` : "Asked 1×"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Deletion Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl">
                ⚠️
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Confirm Permanent Document Deletion
                </h3>
                <p className="text-xs text-slate-500">Atomic removal from vector store and index registry.</p>
              </div>
            </div>

            <p className="text-sm text-slate-700">
              Are you sure you want to delete <strong className="text-slate-900">{targetForDelete?.pdf}</strong>?
            </p>

            {previewLoading && (
              <div className="py-3 flex items-center gap-2 text-xs text-slate-500">
                <span className="w-4 h-4 border-2 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
                Calculating vector store impact...
              </div>
            )}

            {previewData && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-1">
                <p className="font-bold">⚠️ Impact Analysis:</p>
                <p>
                  This operation will permanently delete <strong>{previewData.chunks_affected} chunks</strong> from the active knowledge base. This action cannot be undone.
                </p>
              </div>
            )}

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                ❌ {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deleteActionLoading}
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              {previewData?.can_delete && (
                <button
                  type="button"
                  disabled={deleteActionLoading}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {deleteActionLoading ? "Deleting..." : "Confirm & Delete"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Replacement Modal */}
      {replaceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
                🔄
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Replace Academic Document
                </h3>
                <p className="text-xs text-slate-500">Atomic swap with rollback safety guarantee.</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-1">
              <p>
                Target Document: <strong className="text-slate-900">{targetForReplace?.pdf}</strong> ({targetForReplace?.chunks} chunks).
              </p>
              <p className="text-slate-500">
                The existing document and vector chunks are preserved untouched if replacement ingestion fails.
              </p>
            </div>

            <form onSubmit={handleConfirmReplace} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Replacement PDF <span className="text-rose-500">*</span>
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  required
                  onChange={(e) => setReplaceFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Branch
                  </label>
                  <select
                    value={replaceDept}
                    onChange={(e) => setReplaceDept(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-xl"
                  >
                    <option value="">-- Select --</option>
                    <option value="MCA">MCA</option>
                    <option value="BCA">BCA</option>
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="MBA">MBA</option>
                    <option value="GENERAL">GENERAL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Year
                  </label>
                  <select
                    value={replaceYear}
                    onChange={(e) => setReplaceYear(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-xl"
                  >
                    <option value="">-- Select --</option>
                    <option value="2024-25">2024-25</option>
                    <option value="2025-26">2025-26</option>
                    <option value="2026-27">2026-27</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Category
                  </label>
                  <select
                    value={replaceCategory}
                    onChange={(e) => setReplaceCategory(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-xl"
                  >
                    <option value="">-- Select --</option>
                    <option value="syllabus">Syllabus</option>
                    <option value="notes">Notes</option>
                    <option value="lab_manual">Lab Manual</option>
                    <option value="fee">Fee</option>
                    <option value="exam">Exam</option>
                    <option value="placement">Placement</option>
                    <option value="admission">Admission</option>
                    <option value="general">General</option>
                  </select>
                </div>
              </div>

              {replaceError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                  ❌ {replaceError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={replaceLoading}
                  onClick={() => setReplaceModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={replaceLoading}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {replaceLoading ? "Ingesting & Replacing..." : "Upload & Replace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
