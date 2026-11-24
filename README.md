# College RAG: Multi-Branch Academic Knowledge Assistant 🎓

An enterprise-grade, grounded academic Retrieval-Augmented Generation (RAG) platform tailored for higher-education colleges and universities. The system indexes academic schemes, syllabi, fee structures, class timetables, lecture notes, placement statistics, and lab manuals across multiple institutions and departments.

---

## 🌟 Key Features

1. **Guided 3-Step Student Explorer:**
   - **Step 1:** Select Institution (*Dayananda Sagar - DSCE*, *M.S. Ramaiah - MSRIT*, *Karnataka Textbooks - KTBS*, *General Coursework*).
   - **Step 2:** Select Branch / Department (*MCA*, *BCA*, *CSE*, *GENERAL*).
   - **Step 3:** Select Academic Year (*2024-25*, *2025-26*, *2026-27*).
   - Dynamically filters the document library to show only matching PDFs grouped by category (*Syllabus*, *Fee Structure*, *Timetable*, *Lab Manuals*, *Merit Lists*).
   - 1-click **"🎯 Ask on this PDF"** shortcut to restrict search scope to specific documents.

2. **Slide-Over Filter Drawer:**
   - Off-canvas slide-in filter drawer with dimmed backdrop blur (`z-50`).
   - Dedicated internal scroll container ensuring that search answers, tables, and citations are never obscured by sticky headers.

3. **Hybrid Dense + Lexical BM25 Retrieval:**
   - Combines dense semantic embeddings (`sentence-transformers/all-MiniLM-L6-v2`) with sparse keyword matching (BM25) for high-precision fact lookup (course codes, fee amounts, faculty names).
   - Kannada Nudi transliteration converter for cross-lingual regional textbook queries.

4. **Verifiable Academic Citations & PDF Viewer:**
   - Every grounded answer cites its source document and page number.
   - Built-in PDF Viewer Modal for immediate, in-app verification without external readers.

5. **Secure Admin Ingestion Console (`/admin`):**
   - Password-protected document management with Bearer token authentication.
   - Upload new syllabi, fees, and timetables with target institution and category tagging.
   - Real-time indexing status monitoring and inventory KPI dashboard.

---

## 🏛️ System Architecture

```text
┌────────────────────────────────────────────────────────┐
│               Next.js 14 Web Interface                 │
│  • Student Assistant (/ask)  • Admin Console (/admin)  │
│  • Slide-Over Drawer         • PDF Viewer Modal        │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / JSON
┌──────────────────────────▼─────────────────────────────┐
│             Flask RAG Backend Engine (Port 5000)        │
│  • Hybrid Search: Dense Vector + Lexical BM25          │
│  • Institution & Branch Metadata Scope Filter          │
│  • Kannada Script & Nudi Transliteration Engine        │
└──────────────────────────┬─────────────────────────────┘
                           │ Context Injection
┌──────────────────────────▼─────────────────────────────┐
│          Groq Cloud LLM Inference Engine               │
│          • Llama 3.3 70B Versatile Model               │
│          • Grounded Academic Prompt with TTFT Tracking │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start Guide

### Option A: One-Click Startup (Windows)
Double-click `start_system.bat` in the root folder. It will automatically initialize the Python virtual environment, install requirements, and start both the backend server and frontend application.

### Option B: Manual Setup

#### 1. Backend Setup (`rag_ingestion`)
```bash
cd rag_ingestion
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Configure your Groq API key in .env
copy .env.example .env

# Run the Flask backend server
python server.py
```
*Backend runs on `http://127.0.0.1:5000`.*

#### 2. Frontend Setup (`rag_proj`)
```bash
cd rag_proj
npm install

# Configure environment if needed (default connects to port 5000)
copy .env.example .env.local

# Run the Next.js development server
npm run dev
```
*Frontend runs on `http://localhost:3000`.*

---

## 📂 Repository Structure

```text
Rag_Academic/
├── rag_proj/                  # Next.js 14 Frontend Application
│   ├── src/
│   │   ├── app/               # App Router pages (/ask, /admin, api routes)
│   │   ├── components/        # MarkdownRenderer, PdfViewerModal
│   │   └── lib/               # Auth & backend client utilities
│   ├── public/                # Static brand assets
│   ├── package.json           # Dependencies and scripts
│   └── .env.example           # Frontend environment template
│
├── rag_ingestion/             # Flask Backend RAG Engine
│   ├── server.py              # Core REST API server
│   ├── process_document.py    # Document chunking & embedding pipeline
│   ├── chunks_with_embeddings.json # 950 pre-indexed chunks with metadata
│   ├── kannada_nudi_converter.py  # Regional language transliterator
│   ├── semester_utils.py      # Semester taxonomy & query parsing
│   ├── requirements.txt       # Python dependencies
│   └── .env.example           # Backend environment template
│
├── start_system.bat           # Unified one-click application launcher
├── DEMO_GUIDE.md              # Evaluator presentation guide
└── README.md                  # Project documentation
```

---

## 🔒 Security Best Practices
- Secret keys and database credentials are excluded from source control via `.gitignore`.
- Admin upload endpoints enforce constant-time HMAC header authorization (`X-Admin-Key`).
- File uploads are validated with magic byte inspection and staged in isolated directories.
