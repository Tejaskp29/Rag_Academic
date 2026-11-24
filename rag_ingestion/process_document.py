import pdfplumber
import json
import os
import re
import sys
from collections import Counter
from sentence_transformers import SentenceTransformer
from kannada_nudi_converter import convert_nudi_text


class LegacyEncodingError(ValueError):
    """Raised when a PDF uses legacy non-Unicode font encoding that cannot be cleanly indexed."""
    pass


def detect_pdf_encoding(pdf_path_or_pages, max_sample_pages=5):
    """
    Analyzes PDF font and character encoding to distinguish:
      - 'unicode_kannada': Genuine Unicode Kannada text (U+0C80..U+0CFF)
      - 'unicode_mixed': Mixed English and Unicode Kannada text
      - 'legacy_nudi': 8-bit proprietary Nudi/Baraha font encoding without Unicode mapping
      - 'standard_text': Standard English/Latin text
      - 'empty': No text found
    """
    if isinstance(pdf_path_or_pages, str):
        if not os.path.exists(pdf_path_or_pages):
            return {"status": "not_found", "is_indexable": False, "reason": "File does not exist."}
        with pdfplumber.open(pdf_path_or_pages) as pdf:
            sample_pages = [pdf.pages[i] for i in range(min(max_sample_pages, len(pdf.pages)))]
            return _analyze_pages_encoding(sample_pages)
    elif isinstance(pdf_path_or_pages, list):
        return _analyze_pages_encoding(pdf_path_or_pages[:max_sample_pages])
    else:
        return _analyze_pages_encoding([pdf_path_or_pages])


def _analyze_pages_encoding(pages):
    total_chars = 0
    kannada_unicode_chars = 0
    replacement_chars = 0
    nudi_font_chars = 0

    for page in pages:
        chars = getattr(page, 'chars', [])
        total_chars += len(chars)
        text = page.extract_text() or ""
        replacement_chars += text.count('\uFFFD')

        for c in chars:
            fontname = c.get("fontname", "").lower()
            if any(term in fontname for term in ["nudi", "baraha", "akruti", "shree", "kallol"]):
                nudi_font_chars += 1
            for ch in c.get("text", ""):
                if 0x0C80 <= ord(ch) <= 0x0CFF:
                    kannada_unicode_chars += 1

    if total_chars == 0:
        return {
            "status": "empty",
            "has_kannada_unicode": False,
            "has_legacy_nudi_font": False,
            "is_indexable": False,
            "reason": "Document contains no readable text characters.",
            "details": {}
        }

    kannada_ratio = kannada_unicode_chars / total_chars
    nudi_ratio = nudi_font_chars / total_chars
    replacement_ratio = replacement_chars / max(1, total_chars)

    # 1. Genuine Unicode Kannada
    if kannada_ratio > 0.30:
        return {
            "status": "unicode_kannada",
            "has_kannada_unicode": True,
            "has_legacy_nudi_font": False,
            "is_indexable": True,
            "reason": f"Valid Unicode Kannada text detected ({kannada_ratio:.1%} Kannada Unicode characters).",
            "details": {"kannada_ratio": kannada_ratio, "nudi_ratio": nudi_ratio}
        }
    elif kannada_unicode_chars > 20:
        return {
            "status": "unicode_mixed",
            "has_kannada_unicode": True,
            "has_legacy_nudi_font": False,
            "is_indexable": True,
            "reason": f"Mixed English/Kannada Unicode text detected ({kannada_unicode_chars} Kannada characters).",
            "details": {"kannada_ratio": kannada_ratio, "nudi_ratio": nudi_ratio}
        }

    # 2. Legacy Nudi / Baraha non-Unicode encoding
    if nudi_ratio > 0.20 or (nudi_font_chars > 0 and replacement_ratio > 0.05):
        return {
            "status": "legacy_nudi",
            "has_kannada_unicode": False,
            "has_legacy_nudi_font": True,
            "is_indexable": False,
            "can_convert": True,
            "conversion_available": True,
            "reason": (
                "Document uses legacy Nudi/Baraha font encoding with non-Unicode glyph mappings. "
                "Direct extraction produces corrupted text (e.g. replacement characters). "
                "Cannot be indexed without Kannada OCR or Unicode conversion."
            ),
            "details": {"kannada_ratio": kannada_ratio, "nudi_ratio": nudi_ratio, "replacement_ratio": replacement_ratio}
        }

    # 3. Standard Text (English / Latin / Technical)
    return {
        "status": "standard_text",
        "has_kannada_unicode": False,
        "has_legacy_nudi_font": False,
        "is_indexable": True,
        "reason": "Standard Unicode/ASCII text detected (no legacy non-Unicode fonts).",
        "details": {"kannada_ratio": kannada_ratio, "nudi_ratio": nudi_ratio}
    }



def find_real_header_index(table, max_rows_to_check=3):
    """
    Finds the actual column-header row, which isn't always row 0 - some
    tables have a title/caption spanning row before the real headers
    (e.g. "III Semester MCA" before the real "Sl.No, Course Type..." row).
    Returns the index of the first row with at least 2 filled cells,
    within the first few rows.
    """
    for i, row in enumerate(table[:max_rows_to_check]):
        filled = sum(1 for c in row if c and c.strip())
        if filled >= 2:
            return i
    return 0


def is_real_table(table):
    if not table or len(table) == 0:
        return False

    header_index = find_real_header_index(table)
    header_row = table[header_index]

    if len(header_row) < 2:
        return False
    filled = sum(1 for c in header_row if c and str(c).strip())
    if filled < 2 or filled < len(header_row) / 3:
        return False
    if len(header_row) > 25:
        return False

    total_cells = 0
    long_cells = 0
    for row in table:
        for cell in row:
            if cell and str(cell).strip():
                total_cells += 1
                if len(str(cell).split()) > 35:
                    long_cells += 1

    if total_cells > 0 and (long_cells / total_cells) > 0.6:
        return False

    return True


def table_to_text(table):
    header_index = find_real_header_index(table)
    lines = []
    title_text = ""

    if header_index > 0:
        title_row = table[0]
        title_text = " ".join(cell for cell in title_row if cell and cell.strip())
        if title_text:
            lines.append(title_text)

    header = table[header_index]
    header_text = " | ".join(cell if cell else "" for cell in header)
    lines.append(header_text)

    for row in table[header_index + 1:]:
        row_text = " ".join(cell for cell in row if cell and cell.strip())
        if row_text:
            lines.append(row_text)

    # Format rows preserving column boundaries using markdown pipes
    header_lower = header_text.lower()
    is_fee_table = any(kw in header_lower for kw in ["fee", "amount", "tuition", "due date", "inr", "rs."])
    is_timetable = any(kw in header_lower for kw in ["day", "time", "period", "monday", "tuesday", "slot"])
    table_type = "fee" if is_fee_table else ("timetable" if is_timetable else "general")

    data_row_count = 0
    lines = []
    if title_text:
        lines.append(title_text)
    clean_headers = [str(c).replace("\n", " ").strip() if c else "" for c in header]
    lines.append(" | ".join(clean_headers))

    for row in table[header_index + 1:]:
        first_cell = str(row[0]).strip() if row[0] else ""
        is_total_row = any(c and "total" in str(c).strip().lower() for c in row[:2])
        looks_like_serial_number = bool(re.match(r"^\d+\.?$", first_cell))
        if looks_like_serial_number and not is_total_row:
            data_row_count += 1
        row_str = " | ".join(str(cell).replace("\n", " ").strip() if cell else "" for cell in row)
        if any(c for c in row if c and str(c).strip()):
            lines.append(row_str)

    full_text = "\n".join(lines)
    return full_text, header_text, title_text, data_row_count, table_type


def strip_repeated_header(text, header_patterns=None):
    """
    Removes common repeated institutional header/footer lines that appear
    on nearly every page of a document, which otherwise dilute each
    chunk's embedding with non-distinctive, repeated content.
    """
    if header_patterns is None:
        header_patterns = [
            r"DAYANANDA SAGAR COLLEGE OF ENGINEERING.*",
            r"\(A n? Autonomous Institute affiliated to VTU.*\)",
            r"Accredited by National Assessment.*",
            r"OUTCOME BASED EDUCATION \(OBE\).*",
            r"SCHEME OF TEACHING AND EXAMINATION.*",
            r"POST GRADUATE PROGRAM",
            r"MASTER OF COMPUTER APPLICATIONS",
            r"M\s*A\s*S\s*T\s*E\s*R.*",
            r"[IVX]+ Semester MCA Syllabus",
        ]

    lines = text.split("\n")
    cleaned_lines = []
    for line in lines:
        is_boilerplate = any(re.match(pattern, line.strip(), re.IGNORECASE) for pattern in header_patterns)
        if not is_boilerplate:
            cleaned_lines.append(line)

    return "\n".join(cleaned_lines)


SECTION_PATTERNS = [
    r"^\s*Course\s+code\s*:",
    r"^\s*Subject\s+code\s*:",
    r"^\s*(?:Unit|Module)\s*[-:]?\s*[0-9IVXLCDM]+\b",
    r"^\s*(?:ಅಧ್ಯಾಯ|ಭಾಗ|ಘಟಕ)\s*[-:]?\s*[0-9IVXLCDM\u0CE6-\u0CEF]+(?:\b|\s+|$|[-:])",
    r"^\s*Q(?:uestion)?\.?\s*\d+[-:.)]?",
    r"^\s*ಪ್ರಶ್ನೆ\.?\s*[0-9\u0CE6-\u0CEF]+[-:.)]?",
    r"^\s*Fee\s+Structure\b",
    r"^\s*(?:Time\s*Table|Schedule|Examination\s+Notification)\b",
    r"^\s*(?:ವೇಳಾಪಟ್ಟಿ|ಶುಲ್ಕ\s*ವಿವರ|ಪ್ರಕಟಣೆ|ಸುತ್ತೋಲೆ)(?:\b|\s+|$|[-:])",
    r"^\s*(?:Notification|Circular|Notice)\s*[-:]",
    r"^\s*(?:Notification|Circular|Notice)\s*No\.?\b",
    r"^\s*(?:Eligibility\s+Criteria|Admission\s+Procedure)\b",
]
_COMPILED_SECTION_RE = re.compile("|".join(f"(?:{p})" for p in SECTION_PATTERNS), re.IGNORECASE)

def is_section_heading(line):
    """
    Detects section boundaries across diverse college documents:
    - Syllabus course/subject codes ('Course code:', 'Subject code:')
    - Lecture notes modules/units ('Unit - 4', 'Module II')
    - Question papers ('Q1.', 'Question 2:')
    - Fee schedules and notices ('Fee Structure', 'Time Table', 'Circular No.')
    Forces a chunk boundary so unrelated sections never blend together.
    """
    if not line or not line.strip():
        return False
    return bool(_COMPILED_SECTION_RE.match(line.strip()))


def label_above(page, table, strip_height=40):
    """Reads the heading text sitting just above a table (e.g. 'III SEMESTER')."""
    top = table.bbox[1]
    y0 = max(0, top - strip_height)
    if top - y0 < 5:
        return ""
    region = page.crop((0, y0, page.width, top))
    text = (region.extract_text() or "").strip()
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    return lines[-1] if lines else ""


def extract_pages_with_tables_separated(pdf_path, check_encoding=True, convert_legacy=False, max_pages=None):
    """
    Returns page text (with repeated header boilerplate stripped) and
    table texts kept separately, so tables never get merged into the
    paragraph text stream that the chunker processes.
    """
    is_legacy_nudi = False
    if check_encoding and isinstance(pdf_path, str) and os.path.exists(pdf_path):
        enc = detect_pdf_encoding(pdf_path)
        if enc.get("status") == "legacy_nudi":
            if not convert_legacy:
                raise LegacyEncodingError(enc["reason"])
            is_legacy_nudi = True
    elif convert_legacy and isinstance(pdf_path, str) and os.path.exists(pdf_path):
        enc = detect_pdf_encoding(pdf_path)
        if enc.get("status") == "legacy_nudi":
            is_legacy_nudi = True

    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        target_pages = pdf.pages[:max_pages] if max_pages is not None else pdf.pages
        for page_num, page in enumerate(target_pages):
            if is_legacy_nudi:
                page_active = page.filter(lambda obj: obj.get("object_type") != "char" or "helvetica" not in obj.get("fontname", "").lower())
            else:
                page_active = page

            found_tables = page_active.find_tables()
            real_table_boxes = []
            table_texts = []

            for t in found_tables:
                table_data = t.extract()
                if is_real_table(table_data):
                    real_table_boxes.append(t.bbox)
                    full_text, header_text, title_text, row_count, table_type = table_to_text(table_data)

                    # Title inside the table wins. If there is none, use the
                    # heading printed just above the table (e.g. "III SEMESTER").
                    title_source = "table" if title_text else ""
                    if not title_text:
                        heading = strip_repeated_header(label_above(page_active, t))
                        if heading and len(heading) <= 100:
                            title_text = heading
                            title_source = "heading"

                    if is_legacy_nudi:
                        full_text = convert_nudi_text(full_text)
                        header_text = convert_nudi_text(header_text)
                        title_text = convert_nudi_text(title_text)

                    table_texts.append({
                        "text": full_text,
                        "header": header_text,
                        "title": title_text,
                        "title_source": title_source,
                        "row_count": row_count,
                        "table_type": table_type,
                    })

            # If the PDF does not encode explicit space characters, standard x_tolerance=3
            # merges adjacent words together. An x_tolerance of 2.0 cleanly restores word spacing.
            has_explicit_spaces = any(c.get("text", "").isspace() for c in page_active.chars[:100])
            xtol = 3.0 if has_explicit_spaces else 2.0

            if real_table_boxes:
                page_without_tables = page_active
                for box in real_table_boxes:
                    page_without_tables = page_without_tables.outside_bbox(box)
                page_text = page_without_tables.extract_text(x_tolerance=xtol) or ""
            else:
                page_text = page_active.extract_text(x_tolerance=xtol) or ""

            if is_legacy_nudi:
                page_text = convert_nudi_text(page_text)

            page_text = strip_repeated_header(page_text)

            pages.append((page_num + 1, page_text, table_texts))

    if is_legacy_nudi:
        total_kannada_chars = sum(
            1 for _, text, tables in pages
            for ch in text
            if 0x0C80 <= ord(ch) <= 0x0CFF
        )
        if total_kannada_chars < 20:
            raise LegacyEncodingError(
                f"Legacy conversion failed to produce sufficient valid Unicode Kannada text ({total_kannada_chars} characters recovered)."
            )

    return pages


def chunk_with_atomic_tables(pages, chunk_size=800, overlap=150):
    """
    Normal paragraph text gets chunked by size, as before - EXCEPT a new
    chunk is always started when a new course section heading is detected.
    Tables are NEVER split - each table becomes exactly one complete chunk,
    with a descriptive caption prepended.
    """
    chunks = []
    current_chunk = ""
    current_chunk_start_page = pages[0][0] if pages else 1
    current_chunk_end_page = current_chunk_start_page

    for page_num, page_text, table_texts in pages:
        paragraphs = page_text.split("\n")
        for para in paragraphs:
            starts_new_section = is_section_heading(para)

            if (starts_new_section or len(current_chunk) + len(para) > chunk_size) and current_chunk:
                chunks.append({
                    "text": current_chunk.strip(),
                    "page": current_chunk_start_page,
                    "page_end": current_chunk_end_page,
                })
                if starts_new_section:
                    current_chunk = para
                else:
                    overlap_text = current_chunk[-overlap:] if len(current_chunk) > overlap else current_chunk
                    current_chunk = overlap_text + "\n" + para
                current_chunk_start_page = page_num
                current_chunk_end_page = page_num
            else:
                current_chunk += "\n" + para
                current_chunk_end_page = page_num

        for table_info in table_texts:
            n = table_info["row_count"]
            # Only state a row count when numbered rows were actually found.
            # Tables without a serial-number column (e.g. a comparison table)
            # would otherwise get a misleading "0 data rows" in the caption.
            t_type = table_info.get("table_type", "general")
            if t_type == "fee":
                caption = f"This table specifies fee structure and payment details with columns: {table_info['header']}."
                body = table_info["text"]
            elif t_type == "timetable":
                caption = f"This table specifies class or examination timetable schedule with columns: {table_info['header']}."
                body = table_info["text"]
            elif table_info["title_source"] == "table":
                entries = f", with {n} course entries including their codes, credits, and hours" if n > 0 else ""
                caption = f"This table lists the {table_info['title']} course scheme{entries}."
                body = table_info["text"]
            elif table_info["title_source"] == "heading":
                rows = f" It contains {n} data rows." if n > 0 else ""
                caption = f"This table appears under the heading '{table_info['title']}'.{rows}"
                body = f"{table_info['title']}\n{table_info['text']}"
            else:
                rows = f" It contains {n} data rows." if n > 0 else ""
                caption = f"This table has columns: {table_info['header']}.{rows}"
                body = table_info["text"]
            chunks.append({"text": f"[TABLE] {caption}\n{body}", "page": page_num, "page_end": page_num})

    if current_chunk.strip():
        chunks.append({
            "text": current_chunk.strip(),
            "page": current_chunk_start_page,
            "page_end": current_chunk_end_page,
        })

    return chunks


def process_document(pdf_path, department, year, category, convert_legacy=False):
    print(f"Processing: {pdf_path}")
    pdf_filename = os.path.basename(pdf_path)

    pages = extract_pages_with_tables_separated(pdf_path, check_encoding=True, convert_legacy=convert_legacy)
    print(f"Extracted {len(pages)} pages")

    chunks = chunk_with_atomic_tables(pages)
    print(f"Created {len(chunks)} chunks")

    model = SentenceTransformer('all-MiniLM-L6-v2')
    texts = [c["text"] for c in chunks]
    embeddings = model.encode(texts, show_progress_bar=True)

    data_file = r"C:\Users\tejut\rag_ingestion\chunks_with_embeddings.json"
    if os.path.exists(data_file):
        with open(data_file, "r", encoding="utf-8") as f:
            existing_data = json.load(f)
    else:
        existing_data = []

    next_id = max([d.get("chunk_id", i) for i, d in enumerate(existing_data)], default=-1) + 1

    new_entries = []
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        new_entries.append({
            "chunk_id": next_id + i,
            "text": chunk["text"],
            "page": chunk["page"],
            "page_end": chunk["page_end"],
            "embedding": embedding.tolist(),
            "source_pdf": pdf_filename,
            "department": department,
            "year": year,
            "category": category
        })

    all_data = existing_data + new_entries

    with open(data_file, "w", encoding="utf-8") as f:
        json.dump(all_data, f)

    print(f"Added {len(new_entries)} new chunks. Total chunks now: {len(all_data)}")


if __name__ == "__main__":
    pdf_path = sys.argv[1]
    department = sys.argv[2]
    year = sys.argv[3]
    category = sys.argv[4]
    process_document(pdf_path, department, year, category)