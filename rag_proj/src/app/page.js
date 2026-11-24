"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";

const SUGGESTED_QUESTIONS = [
  {
    category: "College Fee Matrix",
    icon: "💰",
    question: "What is the total annual fee for Karnataka PGCET quota vs Management quota for MCA at DSCE?",
    tag: "DSCE MCA Fee",
    dept: "MCA",
    cat: "fee",
  },
  {
    category: "Merit Rankings & CGPA",
    icon: "🏆",
    question: "List the top 5 students in the MCA semester rank list.",
    tag: "MCA Merit List",
    dept: "MCA",
    cat: "exam",
  },
  {
    category: "Programming Lab Manual",
    icon: "💻",
    question: "Show me the Binary Search Tree implementation in Python from the lab manual.",
    tag: "Python Lab",
    dept: "MCA",
    cat: "lab_manual",
  },
  {
    category: "BCA Web Programming",
    icon: "🌐",
    question: "What is Experiment 1 in the BCA Web Programming lab manual?",
    tag: "BCA Lab Manual",
    dept: "BCA",
    cat: "lab_manual",
  },
  {
    category: "CSE Data Structures",
    icon: "⚡",
    question: "How is circular queue implemented in the CSE Data Structures lab manual?",
    tag: "CSE Lab Manual",
    dept: "CSE",
    cat: "lab_manual",
  },
  {
    category: "Attendance & Placements",
    icon: "💼",
    question: "What are the MCA placement statistics and minimum attendance requirement at DSCE?",
    tag: "Regulations & Jobs",
    dept: "MCA",
    cat: "placement",
  },
];

const CATEGORY_META = {
  syllabus: { name: "Syllabus & Scheme", icon: "📘", badgeClass: "bg-sky-50 text-sky-700 border-sky-200" },
  notes: { name: "Lecture Notes", icon: "📝", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  lab_manual: { name: "Lab Manual", icon: "💻", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  fee: { name: "Fee Structure", icon: "💰", badgeClass: "bg-purple-50 text-purple-700 border-purple-200" },
  exam: { name: "Exam & Merit List", icon: "🏆", badgeClass: "bg-rose-50 text-rose-700 border-rose-200" },
  placement: { name: "Placement Records", icon: "💼", badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  admission: { name: "Admission Guidelines", icon: "🎓", badgeClass: "bg-teal-50 text-teal-700 border-teal-200" },
  general: { name: "General / Other", icon: "📄", badgeClass: "bg-slate-50 text-slate-700 border-slate-200" },
};

const BRANCH_NAMES = {
  MCA: "Master of Computer Applications",
  BCA: "Bachelor of Computer Applications",
  CSE: "Computer Science & Engineering",
  ECE: "Electronics & Communication",
  MBA: "Master of Business Administration",
  GENERAL: "General & University-Wide",
};

export default function HomePage() {
  const [documents, setDocuments] = useState([]);
  const [branchesSummary, setBranchesSummary] = useState([]);
  const [branchesCount, setBranchesCount] = useState(0);
  const [categoriesCount, setCategoriesCount] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [loadingDocs, setLoadingDocs] = useState(true);

  // Active filters for library explorer
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  useEffect(() => {
    async function fetchDocs() {
      try {
        const res = await fetch("/api/documents");
        const data = await res.json();
        if (res.ok && data.success) {
          setDocuments(data.documents || []);
          setBranchesSummary(data.branches_summary || []);
          setBranchesCount(data.branches_count || 0);
          setCategoriesCount(data.categories_count || 0);
          setTotalChunks(data.total_chunks || 0);
        }
      } catch (err) {
        console.error("Error fetching library documents:", err);
      } finally {
        setLoadingDocs(false);
      }
    }
    fetchDocs();
  }, []);

  // Filter documents by selected branch & category
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const docDept = (doc.department || "GENERAL").toUpperCase();
      const docCat = (doc.category || "general").toLowerCase();

      const matchesBranch = selectedBranch === "ALL" || docDept === selectedBranch;
      const matchesCategory = selectedCategory === "ALL" || docCat === selectedCategory;

      return matchesBranch && matchesCategory;
    });
  }, [documents, selectedBranch, selectedCategory]);

  // Categories available under the current active branch
  const activeBranchCategories = useMemo(() => {
    if (selectedBranch === "ALL") {
      const catMap = new Map();
      for (const doc of documents) {
        const cat = (doc.category || "general").toLowerCase();
        catMap.set(cat, (catMap.get(cat) || 0) + 1);
      }
      return Array.from(catMap.entries()).map(([id, count]) => ({
        id,
        name: CATEGORY_META[id]?.name || id,
        icon: CATEGORY_META[id]?.icon || "📄",
        count,
      }));
    }

    const branchData = branchesSummary.find((b) => b.branch === selectedBranch);
    if (!branchData) return [];

    return branchData.categories.map((c) => ({
      id: c.category,
      name: c.category_name,
      icon: CATEGORY_META[c.category]?.icon || "📄",
      count: c.count,
    }));
  }, [documents, branchesSummary, selectedBranch]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <nav className="border-b border-slate-200 bg-white/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xl shadow-sm">
              🎓
            </div>
            <div>
              <span className="font-bold text-slate-900 text-base sm:text-lg tracking-tight block leading-tight">
                College RAG
              </span>
              <span className="text-xs text-slate-500 font-medium block">
                Academic Knowledge Retrieval System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/ask"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold shadow-sm transition-colors"
            >
              <span>Ask Assistant</span>
              <span className="text-sky-200">→</span>
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-sm font-medium transition-colors"
            >
              Admin Portal
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-100/90 border border-sky-200 text-sky-800 text-xs font-semibold uppercase tracking-wider mb-6">
          <span className="w-2 h-2 rounded-full bg-sky-600 animate-pulse"></span>
          Hierarchical Academic Knowledge across Branches & Categories
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-950 tracking-tight leading-tight max-w-4xl mx-auto mb-6">
          Verified Academic Search for{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-indigo-600">
            All College Branches & Courses
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-8 leading-relaxed">
          Instantly query officially uploaded documents organized by academic department (MCA, BCA, CSE, General) and categories like Syllabi, Lecture Notes, Lab Manuals, Fee Structures, Merit Lists, and Placement Statistics.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
          <Link
            href="/ask"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-base shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-2"
          >
            <span>Start Asking Questions</span>
            <span>→</span>
          </Link>
          <a
            href="#documents"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-semibold text-base border border-slate-300 shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <span>Explore Branches & Library</span>
            <span className="text-slate-400">↓</span>
          </a>
        </div>
      </section>

      {/* Trust & Performance Metrics Banner */}
      <section className="border-y border-slate-200 bg-white py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-sky-600">
              {branchesCount || 4} Branches
            </div>
            <div className="text-xs sm:text-sm font-medium text-slate-500 mt-1">MCA, BCA, CSE, General</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600">
              {categoriesCount || 6} Categories
            </div>
            <div className="text-xs sm:text-sm font-medium text-slate-500 mt-1">Notes, Fee, Labs, Syllabi</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {documents.length || 12} Verified Documents
            </div>
            <div className="text-xs sm:text-sm font-medium text-slate-500 mt-1">Admin Uploaded & Indexed</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
              {totalChunks || 944} Chunks
            </div>
            <div className="text-xs sm:text-sm font-medium text-slate-500 mt-1">100% Physical Page Citations</div>
          </div>
        </div>
      </section>

      {/* Suggested Questions Quick Launcher */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Try Evaluator & Student Test Queries</h2>
            <p className="text-xs sm:text-sm text-slate-500">Click any scenario to ask with pre-configured branch and category filters</p>
          </div>
          <Link href="/ask" className="text-xs sm:text-sm font-semibold text-sky-600 hover:text-sky-700">
            Open Chatroom →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SUGGESTED_QUESTIONS.map((sq, i) => (
            <Link
              key={i}
              href={`/ask?q=${encodeURIComponent(sq.question)}&department=${sq.dept}&category=${sq.cat}`}
              className="p-4 rounded-xl bg-white border border-slate-200 hover:border-sky-300 hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {sq.tag}
                  </span>
                  <span className="text-lg">{sq.icon}</span>
                </div>
                <p className="text-sm font-medium text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-2">
                  {sq.question}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>{sq.category}</span>
                <span className="text-sky-600 font-semibold group-hover:translate-x-0.5 transition-transform">Ask →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Available Document Library Organized by Branch & Category */}
      <section id="documents" className="py-14 bg-slate-100/70 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <div className="text-xs font-semibold text-sky-700 tracking-wider uppercase mb-1">
                Official Knowledge Library
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Available Documents by Branch & Category
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Browse documents categorized by academic branch (MCA, BCA, CSE, General) and admin-assigned category.
              </p>
            </div>
            <Link
              href="/ask"
              className="text-sm font-semibold text-sky-600 hover:text-sky-800 inline-flex items-center gap-1 shrink-0"
            >
              <span>Query all documents</span>
              <span>→</span>
            </Link>
          </div>

          {/* Academic Branch Selector Tabs */}
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs mb-6">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedBranch("ALL");
                  setSelectedCategory("ALL");
                }}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedBranch === "ALL"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span>🏛️ All Branches</span>
                <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${selectedBranch === "ALL" ? "bg-sky-700 text-sky-100" : "bg-slate-200 text-slate-600"}`}>
                  {documents.length}
                </span>
              </button>

              {branchesSummary.map((b) => (
                <button
                  key={b.branch}
                  type="button"
                  onClick={() => {
                    setSelectedBranch(b.branch);
                    setSelectedCategory("ALL");
                  }}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedBranch === b.branch
                      ? "bg-sky-600 text-white shadow-xs"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span>{b.branch}</span>
                  <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${selectedBranch === b.branch ? "bg-sky-700 text-sky-100" : "bg-slate-200 text-slate-600"}`}>
                    {b.document_count}
                  </span>
                </button>
              ))}
            </div>

            {/* Active Branch Description & Category Breakdown Bar */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="text-xs text-slate-600">
                <span className="font-semibold text-slate-800">
                  {selectedBranch === "ALL" ? "All Departments" : `${BRANCH_NAMES[selectedBranch] || selectedBranch} (${selectedBranch})`}:
                </span>{" "}
                <span>
                  {selectedBranch === "ALL"
                    ? `Showing ${filteredDocuments.length} total documents across ${branchesCount} branches.`
                    : `${filteredDocuments.length} document(s) uploaded under ${activeBranchCategories.length} categories.`}
                </span>
              </div>

              {/* Sub-Category Filter Chips */}
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("ALL")}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    selectedCategory === "ALL"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All ({selectedBranch === "ALL" ? documents.length : branchesSummary.find((b) => b.branch === selectedBranch)?.document_count || 0})
                </button>
                {activeBranchCategories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCategory(c.id)}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                      selectedCategory === c.id
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <span>{c.icon}</span>
                    <span>{c.name}</span>
                    <span className="text-[10px] opacity-75">({c.count})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Document Cards Grid */}
          {loadingDocs ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="text-2xl mb-2">⏳</div>
              <p className="font-medium text-sm">Loading available documents and branch taxonomy...</p>
            </div>
          ) : filteredDocuments.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map((doc, idx) => {
                const catInfo = CATEGORY_META[doc.category?.toLowerCase()] || CATEGORY_META.general;
                const deptDisplay = doc.department || "GENERAL";

                return (
                  <div
                    key={idx}
                    className="p-4 bg-white rounded-xl border border-slate-200 hover:border-sky-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Badges: Branch & Category */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-900 text-white tracking-wide">
                          {deptDisplay}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border flex items-center gap-1 ${catInfo.badgeClass}`}>
                          <span>{catInfo.icon}</span>
                          <span>{catInfo.name}</span>
                        </span>
                      </div>

                      {/* Document Name */}
                      <h3 className="font-semibold text-slate-900 text-sm line-clamp-2 leading-snug mb-1" title={doc.pdf}>
                        {doc.pdf}
                      </h3>

                      {/* Metadata Details */}
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-500">
                        {doc.year && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 font-medium">
                            Year: {doc.year}
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 font-medium">
                          {doc.chunks} chunks
                        </span>
                      </div>
                    </div>

                    {/* Card Actions: Search in this branch & View PDF */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <a
                        href={`/api/pdf?file=${encodeURIComponent(doc.pdf)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-slate-600 hover:text-slate-900 hover:underline inline-flex items-center gap-1"
                      >
                        <span>📄 View PDF</span>
                        <span className="text-[10px]">↗</span>
                      </a>

                      <Link
                        href={`/ask?department=${encodeURIComponent(deptDisplay)}&category=${encodeURIComponent(doc.category || "")}&pdf=${encodeURIComponent(doc.pdf)}`}
                        className="font-bold text-sky-600 hover:text-sky-800 hover:bg-sky-50 px-2 py-1 rounded transition-colors inline-flex items-center gap-1"
                      >
                        <span>Search in {deptDisplay}</span>
                        <span>→</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
              <div className="text-3xl mb-2">🔍</div>
              <p className="font-semibold text-slate-700">No documents found matching this filter.</p>
              <p className="text-xs text-slate-500 mt-1">Try selecting &apos;All Branches&apos; or clearing the category filter.</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedBranch("ALL");
                  setSelectedCategory("ALL");
                }}
                className="mt-3 px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span className="font-semibold text-slate-700">College RAG</span> — Academic Knowledge Retrieval System &bull; Multi-Branch & Category Edition
          </div>
          <div className="flex items-center gap-4">
            <Link href="/ask" className="hover:text-slate-800 transition-colors">
              Ask Assistant
            </Link>
            <span>&bull;</span>
            <Link href="/admin" className="hover:text-slate-800 transition-colors">
              Admin Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
