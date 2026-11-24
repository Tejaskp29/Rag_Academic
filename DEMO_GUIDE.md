# College RAG Academic Knowledge Retrieval System — Proctor Demonstration Guide

**Project:** College RAG Academic Knowledge Retrieval System  
**Frontend URL:** `http://localhost:3000` (Student Q&A: `http://localhost:3000/ask`)  
**Admin Portal:** `http://localhost:3000/admin` (Key: `college_rag_admin_secret_key_2026`)  
**Backend API:** `http://127.0.0.1:5000`  

---

## 1. Quick Launch (10 Seconds)
1. Double-click `start_system.bat` in the project folder.
2. Wait ~10 seconds while the script checks runtime dependencies and starts both Flask and Next.js.
3. The browser will automatically open to `http://localhost:3000`.

---

## 2. Five Working Demonstration Questions

Use these 5 pre-tested questions during your project presentation to demonstrate every core feature of your RAG architecture.

---

### Demo Question 1: Course Outcomes & Interactive PDF Citation
*Demonstrates: Factual academic grounding, markdown table rendering, and interactive page navigation.*

- **Where:** `http://localhost:3000/ask`
- **Institution Filter:** Leave blank or select **DSCE**
- **Query:**
  ```text
  What are the course outcomes for MMC101 Database Management Systems?
  ```
- **Expected Answer:**
  - Identifies MMC101 as 3-credit core Database Management Systems course.
  - Lists Course Outcomes CO1 through CO4 with Bloom's taxonomy levels (L3, L4).
- **Proctor Highlight:**  
  Show the proctor the citation badge: **`[2024 Scheme and Syllabus.pdf, Page 12]`**.  
  👉 **Click the citation pill (`Page 12 ↗`)** to open the embedded PDF viewer directly at Page 12 of the official DSCE syllabus document!

---

### Demo Question 2: Autonomous College Scheme Comparison
*Demonstrates: Cross-document comparative synthesis and accurate course disambiguation.*

- **Where:** `http://localhost:3000/ask`
- **Institution Filter:** Leave blank / All Institutions
- **Query:**
  ```text
  Compare the total credits required in the first semester for DSCE and MSRIT.
  ```
- **Expected Answer:**
  - Formats a clear comparison table:
    - **DSCE MCA I Semester:** **18 credits** (from 2024 Scheme and Syllabus.pdf, Page 2).
    - **MSRIT MCA I Semester:** **22 credits** (from MSRIT_MCA_Syllabus.pdf, Page 2 & 6).
  - Notes that non-credit audit courses (such as MMAT108 Bridge Mathematics in DSCE) do not inflate the official 18-credit total.
- **Proctor Highlight:**  
  Point out how generic AI systems hallucinate or perform manual arithmetic errors, whereas this system strictly extracts the official printed total rows from autonomous college scheme tables.

---

### Demo Question 3: Multilingual Regional Language Retrieval (Kannada)
*Demonstrates: Dual-Query Reciprocal Rank Fusion (RRF) on native Kannada script.*

- **Where:** `http://localhost:3000/ask`
- **Institution Filter:** Select **KTBS** (or All)
- **Query:**
  ```text
  ಭಾರತ ಕಂಡ ಮೊದಲ ಸಾಮ್ರಾಜ್ಯ ಯಾವುದು?
  ```
  *(Meaning: "Which was the first empire of India?")*
- **Expected Answer:**
  - Returns a natural, fluent Kannada response:
    *"ಭಾರತ ಕಂಡ ಮೊದಲ ಸಾಮ್ರಾಜ್ಯ **ಮೌರ್ಯ ಸಾಮ್ರಾಜ್ಯ** ಎಂದು ಉಲ್ಲೇಖಿಸಲಾಗಿದೆ (8th Kannada SS Part 2 2026-27.pdf, ಪುಟ 3)."*
- **Proctor Highlight:**  
  Demonstrates that Karnataka regional textbooks and Kannada medium students are fully supported using native Kannada script processing and Dual-Query RRF without needing external translation plugins.

---

### Demo Question 4: Technical Lecture Notes & Exception Handling
*Demonstrates: Retrieval over unstructured course notes and code snippets.*

- **Where:** `http://localhost:3000/ask`
- **Institution Filter:** Select **General**
- **Query:**
  ```text
  What are the common runtime exceptions explained in Java Unit 4?
  ```
- **Expected Answer:**
  - Outlines runtime exceptions explained in Java Unit 4:
    1. `ArithmeticException` (division by zero)
    2. `NullPointerException` (accessing null object references)
    3. `ArrayIndexOutOfBoundsException` (invalid array index access)
    4. `NegativeArraySizeException`
  - Cites `java_unit4.pdf`, Page 14.
- **Proctor Highlight:**  
  Shows that the RAG pipeline indexes both structured curriculum schemes and lecture note packages.

---

### Demo Question 5: Multi-Tenant Tenant Isolation & Safe Refusal
*Demonstrates: Anti-hallucination guardrails and multi-tenant security.*

- **Where:** `http://localhost:3000/ask`
- **Institution Filter:** Set specifically to **DSCE**
- **Query:**
  ```text
  What is the course syllabus for 25MCA14 at MSRIT?
  ```
- **Expected Behavior:**
  - The system detects that the user filtered strictly to **DSCE**, but asked for an MSRIT course code (`25MCA14`).
  - **Refusal Guidance:** The system refuses to fabricate an answer and presents helpful REC-11 refusal guidance:
    *"I couldn't find information about this in Dayananda Sagar College of Engineering (DSCE) 2024 Scheme & Syllabus. Please ask a question related to these academic topics or select a different institution."*
- **Proctor Highlight:**  
  Emphasize that the system **never leaks cross-college data** or hallucinates when a student selects an institutional filter.

---

## 3. Anticipated Proctor Q&A

**Q: How does the retrieval pipeline work?**  
*A:* We use a hybrid retrieval architecture. A lexical BM25 Okapi model with an Optimistic Concurrency Control (OCC) generation cache handles exact keywords and course codes (`MMC101`, `25MCA14`). In parallel, a dense Sentence-Transformer (`all-MiniLM-L6-v2`) handles semantic intent. Both results are fused using Reciprocal Rank Fusion (RRF with $K=60$).

**Q: How do you prevent LLM hallucinations?**  
*A:* Answers are generated using Groq (`openai/gpt-oss-120b`) at temperature 0, bound strictly by retrieved context chunks. A post-processing citation verification pipeline scans the answer text, validates every page against the retrieved evidence chunks, and suppresses any ungrounded citations.

**Q: How large is the database and how is it structured?**  
*A:* The production vector database contains exactly 885 chunks indexed across 4 official academic documents, protected by SHA-256 hash `28ee8fcd8d6584fff76a72eab6a7d6913603aae92d28f753ac116a6d4c70aa9a`.

**Q: Does it work offline?**  
*A:* The entire retrieval pipeline (BM25 lexical index, Sentence-Transformer vector embeddings, and chunk matching) runs 100% locally on the CPU without internet. Only the final generation step uses the cloud Groq API for ultra-fast response streaming.
