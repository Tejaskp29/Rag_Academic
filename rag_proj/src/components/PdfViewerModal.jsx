"use client";

import React, { useEffect } from "react";

export default function PdfViewerModal({ isOpen, pdf, page, onClose }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !pdf) return null;

  const targetPage = page ? Math.max(1, Number(page)) : 1;
  const pdfUrl = `/api/pdf?file=${encodeURIComponent(pdf)}#page=${targetPage}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-100 border-b border-slate-200 text-slate-800">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="text-xl">📄</span>
            <div className="truncate">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                {pdf}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Viewing physical page{" "}
                <span className="font-bold text-sky-700">{targetPage}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 shadow-2xs transition-colors inline-flex items-center gap-1.5"
            >
              <span>New Window</span>
              <span className="text-[10px]">↗</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close PDF Viewer"
              className="w-8 h-8 rounded-lg bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* PDF Frame */}
        <div className="flex-1 w-full bg-slate-200 relative">
          <iframe
            src={pdfUrl}
            title={`PDF Document - ${pdf}`}
            className="w-full h-full border-0"
          />
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>
            Targeted Citation Grounding &bull; Physical Page {targetPage}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Close Viewer (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}
