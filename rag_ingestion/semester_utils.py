import re

ROMAN = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8}
SEMESTER_NAMES = {1: "Semester I", 2: "Semester II", 3: "Semester III", 4: "Semester IV",
                  5: "Semester V", 6: "Semester VI", 7: "Semester VII", 8: "Semester VIII"}
WORDS = {"first": 1, "second": 2, "third": 3, "fourth": 4,
         "fifth": 5, "sixth": 6, "seventh": 7, "eighth": 8}

# Longest alternatives first so "III" is not read as "I", and "IV" not as "V".
_ROMAN_RE = r"(?:viii|vii|vi|iv|v|iii|ii|i)"


def semester_name(sem_num):
    """Returns canonical representation like 'Semester I', or None."""
    return SEMESTER_NAMES.get(sem_num)


def semester_in_question(question):
    """
    Returns the semester number (1-8) a question is asking about, or None.
    Understands: "2nd semester", "3 sem", "semester 4", "second semester",
    "first-semester", "second-semester", "II semester", "semester III".
    """
    q = question.lower()

    patterns = [
        (r"\b(\d{1,2})(?:st|nd|rd|th)?[\s\-]*sem(?:ester)?\b", "num"),
        (r"\bsem(?:ester)?\s*[-:]?\s*(\d{1,2})\b", "num"),
        (r"\b(" + "|".join(WORDS) + r")[\s\-]+sem(?:ester)?\b", "word"),
        (r"\bsem(?:ester)?[\s\-]+(" + "|".join(WORDS) + r")\b", "word"),
        (r"\b(" + _ROMAN_RE + r")[\s\-]+sem(?:ester)?\b", "roman"),
        (r"\bsem(?:ester)?[\s\-]+(" + _ROMAN_RE + r")\b", "roman"),
    ]

    for pattern, kind in patterns:
        m = re.search(pattern, q)
        if not m:
            continue
        value = m.group(1)
        if kind == "num":
            n = int(value)
        elif kind == "word":
            n = WORDS[value]
        else:
            n = ROMAN[value.upper()]
        # Ignore things like "2024-25 semester" (25 is not a semester number)
        if 1 <= n <= 8:
            return n
    return None


def semesters_in_question(question):
    """
    Returns a list of semester numbers (e.g. [1, 2]) that a question is asking about,
    or None if no semester is specified.
    Supports single semester expressions as well as 'first two semesters', 'first and second semester', etc.
    """
    if not question:
        return None
    q = str(question).lower()
    if re.search(r'\bfirst\s+(?:two|2)\s+sem(?:ester)?s?\b', q):
        return [1, 2]
    if re.search(r'\bfirst\s+(?:three|3)\s+sem(?:ester)?s?\b', q):
        return [1, 2, 3]
    if re.search(r'\bfirst\s+and\s+second\s+sem(?:ester)?s?\b', q):
        return [1, 2]
    if re.search(r'\b(?:i\s+and\s+ii|1st\s+and\s+2nd)\s+sem(?:ester)?s?\b', q):
        return [1, 2]
    single = semester_in_question(question)
    if single is not None:
        return [single]
    return None


def semester_of_chunk(text):
    """
    Returns the semester number (1-8) a stored chunk belongs to, read from:
    1. Table caption (e.g. "...the II Semester MCA course scheme..." or
       "...under the heading 'III SEMESTER'...")
    2. Course codes encoding semester:
       - MSRIT: 25MCA<sem><num> (e.g. 25MCA11 -> Sem 1, 25MCA27 -> Sem 2)
       - DSCE: MMC<sem><num> (e.g. MMC101, MMC103 -> Sem 1, MMC201 -> Sem 2)
    3. Explicit semester headings in chunk text.
    """
    if isinstance(text, dict):
        text = text.get("text", "")

    if not text or not isinstance(text, str):
        return None

    # 1. Existing table caption check
    if text.startswith("[TABLE]"):
        m = re.search(r"\b(VIII|VII|VI|IV|V|III|II|I)\s+SEMESTER\b", text[:160], re.IGNORECASE)
        if m:
            return ROMAN.get(m.group(1).upper())

    # 2. Check course codes encoding semester
    m_msrit = re.search(r"\b25MCA([1-4])\d\b", text[:250], re.IGNORECASE)
    if m_msrit:
        return int(m_msrit.group(1))

    m_dsce = re.search(r"\bMMC([1-4])\d{2}\b", text[:250], re.IGNORECASE)
    if m_dsce:
        return int(m_dsce.group(1))

    # 3. Explicit semester heading in first 250 characters
    m_hdr = re.search(r"\b(VIII|VII|VI|IV|V|III|II|I)\s+SEMESTER\b", text[:250], re.IGNORECASE)
    if m_hdr:
        return ROMAN.get(m_hdr.group(1).upper())

    return None
