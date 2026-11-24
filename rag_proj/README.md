# College RAG Academic Knowledge Retrieval System

An enterprise-grade, institution-aware, bilingual (English & Kannada) Academic Retrieval-Augmented Generation (RAG) platform developed for college students and faculty.

The platform provides factual, syllabus-grounded answers to academic queries, interactive PDF citation verification, multi-tenant partitioning across colleges, and administrative document lifecycle management.

---

## Architecture Overview

```
Frontend (Next.js 16 App Router - Port 3000)
    │
    ▼ [Internal HTTP Proxy: /api/*]
Backend (Python Flask 3.1 - Port 5000)
    ├── Hybrid Search: BM25Okapi (OCC Cache) + SentenceTransformer (all-MiniLM-L6-v2)
    ├── Fusion: Dual-Query Reciprocal Rank Fusion (RRF)
    ├── Database: chunks_with_embeddings.json (885 Chunks, SHA-256 Verified)
    └── Synthesis: Groq Cloud API (openai/gpt-oss-120b) with Strict Citation Grounding
```

---

## Prerequisites

1. **Node.js:** v18.0.0 or newer (v20+ recommended)
2. **Python:** v3.11.x with virtual environment installed at `C:\Users\tejut\rag_ingestion\venv`
3. **Web Browser:** Google Chrome or Microsoft Edge

---

## Quick Start (One-Click Launch)

Simply double-click `start_system.bat` located in the root of the project:
```cmd
start_system.bat
```
The launcher will:
1. Verify the Python virtual environment and Node.js.
2. Launch the Flask backend on `http://127.0.0.1:5000`.
3. Launch the Next.js frontend on `http://localhost:3000`.
4. Poll health check endpoints until ready.
5. Automatically open `http://localhost:3000` in your default browser.

---

## Manual Execution Instructions

If you prefer to run services manually across separate terminal windows:

### Terminal 1 — Backend (Flask)
```cmd
cd C:\Users\tejut\rag_ingestion
set FLASK_PORT=5000
set FLASK_HOST=127.0.0.1
set HF_HUB_OFFLINE=1
set TRANSFORMERS_OFFLINE=1
set PYTHONIOENCODING=utf-8
venv\Scripts\python.exe -u server.py
```
*Expected status: `Server ready. Loaded 885 chunks. Running on http://127.0.0.1:5000`*

### Terminal 2 — Frontend (Next.js)
```cmd
cd C:\Users\tejut\rag_proj
npm run dev
```
*Expected status: `Ready in ~2.5s on http://localhost:3000`*

---

## Environment Variables & Configuration

### Frontend (`rag_proj/.env.local`)
```env
FLASK_BACKEND_URL=http://127.0.0.1:5000
ADMIN_API_KEY=college_rag_admin_secret_key_2026
ADMIN_PASSWORD=college_rag_admin_secret_key_2026
```

### Backend (`rag_ingestion/.env`)
```env
GROQ_API_KEY=gsk_...
ADMIN_API_KEY=college_rag_admin_secret_key_2026
FLASK_PORT=5000
FLASK_HOST=127.0.0.1
```

---

## Internet Connectivity & Offline Constraints

- **Retrieval Pipeline (100% Offline):**  
  The BM25 lexical search, the `all-MiniLM-L6-v2` Sentence-Transformer model, and vector cosine similarity scoring run entirely on the local CPU without network connectivity (`HF_HUB_OFFLINE=1`).
- **Answer Generation (Requires Internet):**  
  Answer synthesis calls the Groq Cloud API (`https://api.groq.com/openai/v1/chat/completions`) using the `openai/gpt-oss-120b` model. The machine must have outbound HTTPS internet access during live Q&A.

---

## Application Navigation

- **Student Homepage:** `http://localhost:3000`
- **Student Q&A Console:** `http://localhost:3000/ask`
- **Admin Management Portal:** `http://localhost:3000/admin`
  - *Password:* `college_rag_admin_secret_key_2026`
  - *Capabilities:* Review active document inventory, preview chunk distributions, safe PDF deletion, and asynchronous PDF ingestion (max 25 MB).

---

## Automated Verification & Testing

To run the complete automated regression test suite:
```cmd
cd C:\Users\tejut\rag_ingestion
venv\Scripts\python.exe run_all_tests.py
```
- **Total Test Suites:** 25 suites
- **Total Tests:** 329 tests
- **Target Pass Rate:** 100% (329/329 passed, 0 failures, 0 errors)
- **Database Invariance:** Verified at exactly 885 chunks.

For presentation questions, refer to [`DEMO_GUIDE.md`](file:///C:/Users/tejut/rag_proj/DEMO_GUIDE.md).
