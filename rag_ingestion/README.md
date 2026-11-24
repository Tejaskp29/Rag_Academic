# College RAG Backend — Ingestion & Retrieval Engine

Python Flask microservice providing dense and lexical academic document indexing, hybrid retrieval, and citation verification.

## Architecture

- **Web Framework:** Flask 3.1
- **Dense Embeddings:** `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional cosine similarity)
- **Sparse Index:** BM25Okapi with in-memory Optimistic Concurrency Control (OCC) generation cache
- **Multilingual Fusion:** Dual-Query Reciprocal Rank Fusion (RRF) for English and Kannada scripts
- **LLM Synthesis:** Groq API (`openai/gpt-oss-120b`)
- **Database:** `chunks_with_embeddings.json` (885 chunks, SHA-256: `28ee8fcd8d6584fff76a72eab6a7d6913603aae92d28f753ac116a6d4c70aa9a`)

## Execution

```cmd
cd C:\Users\tejut\rag_ingestion
set FLASK_PORT=5000
set FLASK_HOST=127.0.0.1
set HF_HUB_OFFLINE=1
set TRANSFORMERS_OFFLINE=1
venv\Scripts\python.exe -u server.py
```

## Running Tests

```cmd
cd C:\Users\tejut\rag_ingestion
venv\Scripts\python.exe run_all_tests.py
```
*(Runs all 329 regression tests across 25 suites).*
