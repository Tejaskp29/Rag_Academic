"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Safe URL protocol sanitizer (blocks javascript:, vbscript:, data: URIs)
function sanitizeUrl(url) {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("data:")
  ) {
    return "#";
  }
  return trimmed;
}

// Inline Citation Pill component
export function CitationPill({ pdf, page, onOpen }) {
  const shortName = pdf.length > 28 ? pdf.slice(0, 25) + "..." : pdf;

  const handleClick = (e) => {
    e.preventDefault();
    if (typeof onOpen === "function") {
      onOpen(pdf, Number(page));
    } else {
      window.open(
        `/api/pdf?file=${encodeURIComponent(pdf)}#page=${page}`,
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1 my-0.5 mx-1 px-2 py-0.5 rounded bg-sky-100/90 hover:bg-sky-200 text-sky-900 border border-sky-300/80 text-xs font-semibold tracking-tight transition-all shadow-2xs hover:shadow-xs cursor-pointer align-middle"
      title={`Open ${pdf} on Page ${page} in PDF viewer`}
    >
      <span className="text-[11px]">📄</span>
      <span className="font-mono text-[11px]">{shortName}</span>
      <span className="bg-sky-200/80 text-sky-800 px-1 rounded text-[10px] font-bold">
        p.{page}
      </span>
      <span className="text-[10px] text-sky-600">↗</span>
    </button>
  );
}

// Parses text child nodes to inject CitationPill components for academic references
function injectInlineCitations(text, onOpen) {
  if (typeof text !== "string") return text;

  // Regex matching academic citations like:
  // (2024 Scheme and Syllabus.pdf, Page 12)
  // [MSRIT_MCA_Syllabus.pdf, Page 16]
  // MSRIT_MCA_Syllabus.pdf, Page 16
  // java_unit4.pdf, Page 6
  // 8th Kannada SS Part 2 2026-27.pdf, Page 12
  const citationRegex =
    /(?:[\(\[]\s*([^()\[\]\n\r]+?\.pdf)|(?:"|')([^"'\n\r]+?\.pdf)(?:"|')|(\b(?:2024\s+Scheme\s+and\s+Syllabus\.pdf|8th\s+Kannada\s+SS\s+Part\s+2\s+2026-27\.pdf|[a-zA-Z0-9_\-]+\.pdf)))\s*(?:[\,\-]\s*)?(?:Page|p\.|Pages|ಪುಟ(?:\s*ಸಂಖ್ಯೆ)?)\s*[:\-]?\s*(\d+(?:\s*-\s*\d+)?)(?:\s*[\)\]])?/gi;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = citationRegex.exec(text)) !== null) {
    const fullMatch = match[0];
    const pdfName = (match[1] || match[2] || match[3] || "").trim();
    const pageNumStr = (match[4] || "").trim();
    const matchStart = match.index;

    if (!pdfName || !pageNumStr) continue;

    if (matchStart > lastIndex) {
      parts.push(text.slice(lastIndex, matchStart));
    }

    // If multi-page range like "25-27", navigate to first page in modal
    const targetPageNum = Number(pageNumStr.split("-")[0].trim()) || 1;

    parts.push(
      <CitationPill
        key={`cite-${matchStart}-${pdfName}-${pageNumStr}`}
        pdf={pdfName}
        page={targetPageNum}
        onOpen={onOpen}
      />
    );

    lastIndex = matchStart + fullMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

// Code Block with Copy Button and Syntax Header
function CodeBlock({ children, className }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const codeContent = String(children).replace(/\n$/, "");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 text-slate-100 shadow-sm">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-800 text-xs font-mono text-slate-300 border-b border-slate-700">
        <span className="font-semibold text-slate-400 uppercase tracking-wider text-[11px]">
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors cursor-pointer"
        >
          {copied ? "Copied! ✓" : "Copy"}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed">
        <code>{codeContent}</code>
      </pre>
    </div>
  );
}

export default function MarkdownRenderer({ content, onOpenCitation }) {
  if (!content) return null;

  // Custom component mapping for ReactMarkdown
  const components = {
    h1: ({ children }) => (
      <h1 className="text-2xl font-extrabold text-slate-950 mt-6 mb-3 border-b border-slate-200 pb-2 tracking-tight">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-xl font-bold text-slate-900 mt-5 mb-2.5 border-b border-slate-100 pb-1.5 tracking-tight">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-lg font-bold text-slate-900 mt-4 mb-2 tracking-tight">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-base font-semibold text-slate-900 mt-3 mb-1.5">
        {children}
      </h4>
    ),
    h5: ({ children }) => (
      <h5 className="text-sm font-semibold text-slate-900 mt-2 mb-1 uppercase tracking-wide">
        {children}
      </h5>
    ),
    h6: ({ children }) => (
      <h6 className="text-xs font-semibold text-slate-700 mt-2 mb-1 uppercase tracking-wider">
        {children}
      </h6>
    ),
    p: ({ children }) => {
      // In children of p, transform strings to inject citations
      const processed = React.Children.map(children, (child) => {
        if (typeof child === "string") {
          return injectInlineCitations(child, onOpenCitation);
        }
        return child;
      });
      return <p className="text-slate-800 leading-relaxed my-2.5 text-sm sm:text-base">{processed}</p>;
    },
    ul: ({ children }) => (
      <ul className="list-disc pl-5 my-2.5 space-y-1 text-slate-800 text-sm sm:text-base">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal pl-5 my-2.5 space-y-1 text-slate-800 text-sm sm:text-base">
        {children}
      </ol>
    ),
    li: ({ children }) => {
      const processed = React.Children.map(children, (child) => {
        if (typeof child === "string") {
          return injectInlineCitations(child, onOpenCitation);
        }
        return child;
      });
      return <li className="leading-relaxed">{processed}</li>;
    },
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-sky-500 bg-sky-50/60 pl-4 py-2.5 my-3.5 rounded-r-lg text-slate-700 italic text-sm sm:text-base">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="my-5 border-slate-200" />,
    a: ({ href, children }) => (
      <a
        href={sanitizeUrl(href)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sky-600 hover:text-sky-800 underline font-medium transition-colors"
      >
        {children}
      </a>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto my-4 rounded-lg border border-slate-200 shadow-2xs">
        <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-slate-100/90 text-slate-800 font-semibold">{children}</thead>
    ),
    tbody: ({ children }) => (
      <tbody className="divide-y divide-slate-200 bg-white">{children}</tbody>
    ),
    tr: ({ children }) => (
      <tr className="hover:bg-slate-50/80 transition-colors">{children}</tr>
    ),
    th: ({ children }) => (
      <th className="px-3.5 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
        {children}
      </th>
    ),
    td: ({ children }) => {
      const processed = React.Children.map(children, (child) => {
        if (typeof child === "string") {
          return injectInlineCitations(child, onOpenCitation);
        }
        return child;
      });
      return (
        <td className="px-3.5 py-2.5 text-slate-800 text-xs sm:text-sm whitespace-normal leading-normal">
          {processed}
        </td>
      );
    },
    pre: ({ children }) => {
      // If child is a code component
      const child = React.Children.only(children);
      if (child && child.type === "code") {
        return <CodeBlock className={child.props.className}>{child.props.children}</CodeBlock>;
      }
      return <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto my-3 text-xs sm:text-sm">{children}</pre>;
    },
    code: ({ node, inline, className, children, ...props }) => {
      // Standard inline code
      return (
        <code
          className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-xs text-sky-800 font-semibold align-baseline"
          {...props}
        >
          {children}
        </code>
      );
    },
  };

  return (
    <div className="markdown-academic-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
