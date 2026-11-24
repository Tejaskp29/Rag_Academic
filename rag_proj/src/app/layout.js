import "./globals.css";

export const metadata = {
  title: "College RAG — Academic Knowledge Retrieval System",
  description:
    "Verified academic knowledge retrieval system for college curriculum schemes, syllabus specifications, course credits, and state textbooks.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
