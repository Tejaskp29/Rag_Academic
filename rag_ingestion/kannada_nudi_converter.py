"""
kannada_nudi_converter.py

Production-quality converter for legacy KaGaPa / Nudi-encoded Kannada PDFs into clean,
standard Unicode Kannada (U+0C80..U+0CFF).

Supports fonts:
  - Nudi01e, Nudi01eBold, Nudi01k, Nudi01kBold
  - Nudi04e, Nudi04eBold
  - Compatible Baraha ASCII font layouts

Preserves:
  - English vocabulary and acronyms (e.g. 'ECI-Election', 'PDO-Panchayath')
  - Arabic numerals (0-9) and Roman numerals (I, II, III, IV, etc.)
  - Punctuation, layout, newlines, and bullet points
  - PDF page numbering and paragraph flow
"""

import re
from typing import List, Dict, Any, Optional

# Vowels (Independent)
VOWELS = {
    "CA": "ಅಂ", "CB": "ಅಃ",
    "C": "ಅ", "D": "ಆ", "E": "ಇ", "F": "ಈ", "G": "ಉ", "H": "ಊ",
    "IÄ": "ಋ", "IÆ": "ೠ", "J": "ಎ", "K": "ಏ", "L": "ಐ",
    "M": "ಒ", "N": "ಓ", "O": "ಔ"
}

# Special Signs & Ligatures
SPECIAL = {
    "A": "ಂ",
    "B": "ಃ",
    "GY": "ಜ್ಞ",
    "x": "ಕ್ಷ"
}

# Vattaksharagalu (Subscript Consonant Conjuncts)
VATTAKSHARAGALU = {
    "Ì": "ಕ", "Í": "ಖ", "Î": "ಗ", "Ï": "ಘ", "Õ": "ಞ",
    "Ñ": "ಚ", "Ò": "ಛ", "Ó": "ಜ", "Ô": "ಝ", "Ö": "ಟ",
    "×": "ಠ", "Ø": "ಡ", "Ù": "ಢ", "Ú": "ಣ", "Û": "ತ",
    "Ü": "ಥ", "Ý": "ದ", "Þ": "ಧ", "ß": "ನ", "à": "ಪ",
    "á": "ಫ", "â": "ಬ", "ã": "ಭ", "ä": "ಮ", "å": "ಯ",
    "æ": "ರ", "ç": "ರ", "è": "ಲ", "é": "ವ", "ê": "ಶ",
    "ë": "ಷ", "ì": "ಸ", "í": "ಹ", "î": "ಳ"
}

DEPENDENT_VOWELS = set("್ಾಿೀುೂೃೆೇೈೊೋೌ")

# Standalone dependent vowels (when appearing after conjuncts)
STANDALONE_DEPENDENT_VOWELS = {
    "ÉÆÃ": "ೋ", "ÉÆ": "ೊ", "ÉÇÃ": "ೋ", "ÉÇ": "ೊ", "ÉÃ": "ೇ", "ÉÊ": "ೈ", "É": "ೆ",
    "Á": "ಾ", "Ä": "ು", "Æ": "ೂ", "È": "ೃ", "ø": "ೃ", "Ã": "ೀ", "ÂÃ": "ೀ", "Â": "ಿ",
    "Ç": "ೂ", "Å": "ು", "Ë": "ೌ", "ï": "್", "À": "", "÷": ""
}

# Primary Consonant and Kagunita Mapping
# Generated according to Karnataka Government KaGaPa Standard
MAPPING: Dict[str, str] = {
    **VOWELS,
    **SPECIAL,
    **STANDALONE_DEPENDENT_VOWELS,

    # KA (P)
    "PÉÆÃ": "ಕೋ", "PÉÆ": "ಕೊ", "PÉÃ": "ಕೇ", "PÉÊ": "ಕೈ", "PÉ": "ಕೆ",
    "PÁ": "ಕಾ", "PÀÄ": "ಕು", "PÀÆ": "ಕೂ", "PÀÈ": "ಕೃ", "PÀ": "ಕ",
    "Pï": "ಕ್", "PË": "ಕೌ", "QÃ": "ಕೀ", "Q": "ಕಿ", "P": "ಕ",

    # KHA (S, R)
    "SÉÆÃ": "ಖೋ", "SÉÆ": "ಖೊ", "SÉÃ": "ಖೇ", "SÉÊ": "ಖೈ", "SÉ": "ಖೆ",
    "SÁ": "ಖಾ", "RÄ": "ಖು", "RÆ": "ಖೂ", "RÈ": "ಖೃ", "R": "ಖ",
    "Sï": "ಖ್", "SË": "ಖೌ", "TÃ": "ಖೀ", "T": "ಖಿ", "S": "ಖ",

    # GA (U)
    "UÉÆÃ": "ಗೋ", "UÉÆ": "ಗೊ", "UÉÃ": "ಗೇ", "UÉÊ": "ಗೈ", "UÉ": "ಗೆ",
    "UÁ": "ಗಾ", "UÀÄ": "ಗು", "UÀÆ": "ಗೂ", "UÀÈ": "ಗೃ", "UÀ": "ಗ",
    "Uï": "ಗ್", "UË": "ಗೌ", "VÃ": "ಗೀ", "V": "ಗಿ", "U": "ಗ",

    # GHA (W)
    "WÉÆÃ": "ಘೋ", "WÉÆ": "ಘೊ", "WÉÃ": "ಘೇ", "WÉÊ": "ಘೈ", "WÉ": "ಘೆ",
    "WÁ": "ಘಾ", "WÀÄ": "ಘು", "WÀÆ": "ಘೂ", "WÀÈ": "ಘೃ", "WÀ": "ಘ",
    "Wï": "ಘ್", "WË": "ಘೌ", "XÃ": "ಘೀ", "X": "ಘಿ", "W": "ಘ",

    # NGA (Y)
    "Yï": "ಙ್", "Y": "ಙ",

    # CHA (Z)
    "ZÉÆÃ": "ಚೋ", "ZÉÆ": "ಚೊ", "ZÉÃ": "ಚೇ", "ZÉÊ": "ಚೈ", "ZÉ": "ಚೆ",
    "ZÁ": "ಚಾ", "ZÀÄ": "ಚು", "ZÀÆ": "ಚೂ", "ZÀÈ": "ಚೃ", "ZÀ": "ಚ",
    "Zï": "ಚ್", "ZË": "ಚೌ", "aÃ": "ಚೀ", "a": "ಚಿ", "Z": "ಚ",

    # CHHA (b)
    "bÉÆÃ": "ಛೋ", "bÉÆ": "ಛೊ", "bÉÃ": "ಛೇ", "bÉÊ": "ಛೈ", "bÉ": "ಛೆ",
    "bÁ": "ಛಾ", "bÀÄ": "ಛು", "bÀÆ": "ಛೂ", "bÀ": "ಛ", "b": "ಛ",
    "bï": "ಛ್", "bË": "ಛೌ", "cÃ": "ಛೀ", "c": "ಛಿ",

    # JA (e, d)
    "eÉÆÃ": "ಜೋ", "eÉÆ": "ಜೊ", "eÉÃ": "ಜೇ", "eÉÊ": "ಜೈ", "eÉ": "ಜೆ",
    "eÁ": "ಜಾ", "dÄ": "ಜು", "dÆ": "ಜೂ", "dÈ": "ಜೃ", "d": "ಜ", "e": "ಜ",
    "eï": "ಜ್", "eË": "ಜೌ", "fÃ": "ಜೀ", "f": "ಜಿ",

    # JHA (gÀh)
    "gÀhiï": "ಝ್", "gÀhÄ": "ಝ", "gÀhiÁ": "ಝಾ", "jhÄ": "ಝಿ",
    "gÉhÄ": "ಝೆ", "gÉhÆ": "ಝೊ", "gÀhiË": "ಝೌ",

    # NYA (k)
    "kï": "ಞ್", "k": "ಞ",

    # TTA (m, l)
    "mÉÆÃ": "ಟೋ", "mÉÆ": "ಟೊ", "mÉÃ": "ಟೇ", "mÉÊ": "ಟೈ", "mÉ": "ಟೆ",
    "mÁ": "ಟಾ", "lÄ": "ಟು", "lÆ": "ಟೂ", "lÈ": "ಟೃ", "l": "ಟ", "m": "ಟ",
    "mï": "ಟ್", "mË": "ಟೌ", "nÃ": "ಟೀ", "n": "ಟಿ",

    # TTHA (o, p)
    "oÉÆÃ": "ಠೋ", "oÉÆ": "ಠೊ", "oÉÃ": "ಠೇ", "oÉÊ": "ಠೈ", "oÉ": "ಠೆ",
    "oÁ": "ಠಾ", "oÀÄ": "ಠು", "oÀÆ": "ಠೂ", "oÀ": "ಠ", "o": "ಠ",
    "oï": "ಠ್", "oË": "ಠೌ", "oÂÃ": "ಠೀ", "oÂ": "ಠಿ", "p": "ಠಿ",

    # DDA (q)
    "qÉÆÃ": "ಡೋ", "qÉÆ": "ಡೊ", "qÉÃ": "ಡೇ", "qÉÊ": "ಡೈ", "qÉ": "ಡೆ",
    "qÁ": "ಡಾ", "qÀÄ": "ಡು", "qÀÆ": "ಡೂ", "qÀ": "ಡ", "q": "ಡ",
    "qï": "ಡ್", "qË": "ಡೌ", "rÃ": "ಡೀ", "r": "ಡಿ",

    # DDHA (qs)
    "qsÉÆÃ": "ಢೋ", "qsÉÆ": "ಢೊ", "qsÉÃ": "ಢೇ", "qsÉÊ": "ಢೈ", "qsÉ": "ಢೆ",
    "qsÁ": "ಢಾ", "qsÀÄ": "ಢು", "qsÀÆ": "ಢೂ", "qsÀ": "ಢ", "qs": "ಢ",
    "qsï": "ಢ್", "qsË": "ಢೌ", "qsÂÃ": "ಢೀ", "qsÂ": "ಢಿ",

    # NNA (t, u)
    "tÉÆÃ": "ಣೋ", "tÉÆ": "ಣೊ", "tÉÃ": "ಣೇ", "tÉÊ": "ಣೈ", "tÉ": "ಣೆ",
    "uÉÆÃ": "ಣೋ", "uÉÆ": "ಣೊ", "uÉÃ": "ಣೇ", "uÉÊ": "ಣೈ", "uÉ": "ಣೆ",
    "tÁ": "ಣಾ", "tÄ": "ಣು", "tÆ": "ಣೂ", "tÈ": "ಣೃ", "t": "ಣ", "tÀ": "ಣ",
    "uÁ": "ಣಾ", "uÄ": "ಣು", "uÆ": "ಣೂ", "uÀ": "ಣ", "u": "ಣ", "uï": "ಣ್",
    "tï": "ಣ್", "tË": "ಣೌ", "tÂÃ": "ಣೀ", "tÂ": "ಣಿ",

    # TA (v)
    "vÉÆÃ": "ತೋ", "vÉÆ": "ತೊ", "vÉÃ": "ತೇ", "vÉÊ": "ತೈ", "vÉ": "ತೆ",
    "vÁ": "ತಾ", "vÀÄ": "ತು", "vÀÆ": "ತೂ", "vÀÈ": "ತೃ", "vÀ": "ತ", "v": "ತ",
    "vï": "ತ್", "vË": "ತೌ", "wÃ": "ತೀ", "w": "ತಿ",

    # THA (x)
    "xÉÆÃ": "ಥೋ", "xÉÆ": "ಥೊ", "xÉÃ": "ಥೇ", "xÉÊ": "ಥೈ", "xÉ": "ಥೆ",
    "xÁ": "ಥಾ", "xÀÄ": "ಥು", "xÀÆ": "ಥೂ", "xÀ": "ಥ", "x": "ಥ",
    "xï": "ಥ್", "xË": "ಥೌ", "yÃ": "ಥೀ", "y": "ಥಿ",

    # DA (z)
    "zÉÆÃ": "ದೋ", "zÉÆ": "ದೊ", "zÉÃ": "ದೇ", "zÉÊ": "ದೈ", "zÉ": "ದೆ",
    "zÁ": "ದಾ", "zÀÄ": "ದು", "zÀÆ": "ದೂ", "zÀÈ": "ದೃ", "zÀ": "ದ", "z": "ದ",
    "zï": "ದ್", "zË": "ದೌ", "¢Ã": "ದೀ", "¢": "ದಿ",

    # DHA (zs)
    "zsÉÆÃ": "ಧೋ", "zsÉÆ": "ಧೊ", "zsÉÃ": "ಧೇ", "zsÉÊ": "ಧೈ", "zsÉ": "ಧೆ",
    "zsÁ": "ಧಾ", "zsÀÄ": "ಧು", "zsÀÆ": "ಧೂ", "zsÀÈ": "ಧೃ", "zsÀ": "ಧ", "zs": "ಧ",
    "zsï": "ಧ್", "zsË": "ಧೌ", "üÃ": "ಧೀ", "ü": "ಧಿ", "¢s": "ಧಿ",

    # NA (£)
    "£ÉÆÃ": "ನೋ", "£ÉÆ": "ನೊ", "£ÉÃ": "ನೇ", "£ÉÊ": "ನೈ", "£É": "ನೆ",
    "£Á": "ನಾ", "£ÀÄ": "ನು", "£ÀÆ": "ನೂ", "£ÀÈ": "ನೃ", "£À": "ನ", "£": "ನ",
    "£ï": "ನ್", "£Ë": "ನೌ", "¤Ã": "ನೀ", "¤": "ನಿ",

    # PA (¥)
    "¥ÉÆÃ": "ಪೋ", "¥ÉÆ": "ಪೊ", "¥ÉÃ": "ಪೇ", "¥ÉÊ": "ಪೈ", "¥É": "ಪೆ",
    "¥Á": "ಪಾ", "¥ÀÅ": "ಪು", "¥ÀÄ": "ಪು", "¥ÀÇ": "ಪೂ", "¥ÀÆ": "ಪೂ", "¥ÀÈ": "ಪೃ", "¥À": "ಪ", "¥": "ಪ",
    "¥ï": "ಪ್", "¥Ë": "ಪೌ", "¦Ã": "ಪೀ", "¦": "ಪಿ",

    # PHA (¥s)
    "¥sÉÆÃ": "ಫೋ", "¥sÉÆ": "ಫೊ", "¥sÉÃ": "ಫೇ", "¥sÉÊ": "ಫೈ", "¥sÉ": "ಫೆ",
    "¥sÁ": "ಫಾ", "¥sÀÅ": "ಫು", "¥sÀÄ": "ಫು", "¥sÀÇ": "ಫೂ", "¥sÀÆ": "ಫೂ", "¥sÀ": "ಫ", "¥s": "ಫ",
    "¥sï": "ಫ್", "¥sË": "ಫೌ", "¦sÃ": "ಫೀ", "¦s": "ಫಿ",

    # BA (§, ¨)
    "§ÉÆÃ": "ಬೋ", "§ÉÆ": "ಬೊ", "§ÉÃ": "ಬೇ", "§ÉÊ": "ಬೈ", "§É": "ಬೆ",
    "¨ÉÆÃ": "ಬೋ", "¨ÉÆ": "ಬೊ", "¨ÉÃ": "ಬೇ", "¨ÉÊ": "ಬೈ", "¨É": "ಬೆ",
    "§Á": "ಬಾ", "¨Á": "ಬಾ", "§Ä": "ಬು", "¨Ä": "ಬು", "§Æ": "ಬೂ", "¨Æ": "ಬೂ",
    "§È": "ಬೃ", "§À": "ಬ", "§": "ಬ", "¨À": "ಬ", "¨": "ಬ",
    "§ï": "ಬ್", "¨ï": "ಬ್", "§Ë": "ಬೌ", "¨Ë": "ಬೌ", "©Ã": "ಬೀ", "©": "ಬಿ",

    # BHA (¨s)
    "¨sÉÆÃ": "ಭೋ", "¨sÉÆ": "ಭೊ", "¨sÉÃ": "ಭೇ", "¨sÉÊ": "ಭೈ", "¨sÉ": "ಭೆ",
    "¨sÁ": "ಭಾ", "¨sÀÄ": "ಭು", "¨sÀÆ": "ಭೂ", "¨sÀÈ": "ಭೃ", "¨sÀ": "ಭ", "¨s": "ಭ",
    "¨sï": "ಭ್", "¨sË": "ಭೌ", "¨sÂÃ": "ಭೀ", "¨sÂ": "ಭಿ",

    # MA (ªÀÄ, ªÀi)
    "ªÉÆÃ": "ಮೋ", "ªÉÆ": "ಮೊ", "ªÉÄÃ": "ಮೇ", "ªÉÄÊ": "ಮೈ", "ªÉÄ": "ಮೆ",
    "ªÀiÁ": "ಮಾ", "ªÀÄÄ": "ಮು", "ªÀÄÆ": "ಮೂ", "ªÀÄÈ": "ಮೃ", "ªÀÄ": "ಮ",
    "ªÀiï": "ಮ್", "ªÀiË": "ಮೌ", "«ÄÃ": "ಮೀ", "«Ä": "ಮಿ",

    # YA (Ai)
    "AiÉÆÃ": "ಯೋ", "AiÉÆ": "ಯೊ", "AiÉÄÃ": "ಯೇ", "AiÉÄÊ": "ಯೈ", "AiÉÄ": "ಯೆ",
    "AiÀiÁ": "ಯಾ", "AiÀÄÄ": "ಯು", "AiÀÄÆ": "ಯೂ", "AiÀÄ": "ಯ", "Ai": "ಯ",
    "AiÀiï": "ಯ್", "AiÀiË": "ಯೌ", "¬ÄÃ": "ಯೀ", "¬Ä": "ಯಿ", "¬": "ಯಿ",

    # RA (g)
    "gÉÆÃ": "ರೋ", "gÉÆ": "ರೊ", "gÉÃ": "ರೇ", "gÉÊ": "ರೈ", "gÉ": "ರೆ",
    "gÁ": "ರಾ", "gÀÄ": "ರು", "gÀÆ": "ರೂ", "gÀÈ": "ರೃ", "gÀ": "ರ", "g": "ರ",
    "gï": "ರ್", "gË": "ರೌ", "jÃ": "ರೀ", "j": "ರಿ",

    # LA (®, ¯)
    "¯ÉÆÃ": "ಲೋ", "¯ÉÆ": "ಲೊ", "¯ÉÃ": "ಲೇ", "¯ÉÊ": "ಲೈ", "¯É": "ಲೆ",
    "¯Á": "ಲಾ", "®Ä": "ಲು", "®Æ": "ಲೂ", "®È": "ಲೃ", "®À": "ಲ", "®": "ಲ", "¯": "ಲ",
    "¯ï": "ಲ್", "¯Ë": "ಲೌ", "°Ã": "ಲೀ", "°": "ಲಿ",

    # VA (ª)
    "ªÉÇÃ": "ವೋ", "ªÉÇ": "ವೊ",
    "ªÉÃ": "ವೇ", "ªÉÊ": "ವೈ", "ªÉ": "ವೆ",
    "ªÁ": "ವಾ", "ªÀÅ": "ವು", "ªÀÇ": "ವೂ", "ªÀÈ": "ವೃ", "ªÀ": "ವ", "ª": "ವ",
    "ªï": "ವ್", "ªË": "ವೌ", "«Ã": "ವೀ", "«": "ವಿ",

    # SHA (±)
    "±ÉÆÃ": "ಶೋ", "±ÉÆ": "ಶೊ", "±ÉÃ": "ಶೇ", "±ÉÊ": "ಶೈ", "±É": "ಶೆ",
    "±Á": "ಶಾ", "±ÀÄ": "ಶು", "±ÀÆ": "ಶೂ", "±ÀÈ": "ಶೃ", "±À": "ಶ", "±": "ಶ",
    "±ï": "ಶ್", "±Ë": "ಶೌ", "²Ã": "ಶೀ", "²": "ಶಿ",

    # SSA (µ)
    "µÉÆÃ": "ಷೋ", "µÉÆ": "ಷೊ", "µÉÃ": "ಷೇ", "µÉÊ": "ಷೈ", "µÉ": "ಷೆ",
    "µÁ": "ಷಾ", "µÀÄ": "ಷು", "µÀÆ": "ಷೂ", "µÀÈ": "ಷೃ", "µÀ": "ಷ", "µ": "ಷ",
    "µï": "ಷ್", "µË": "ಷೌ", "¶Ã": "ಷೀ", "¶": "ಷಿ",

    # SA (¸)
    "¸ÉÆÃ": "ಸೋ", "¸ÉÆ": "ಸೊ", "¸ÉÃ": "ಸೇ", "¸ÉÊ": "ಸೈ", "¸É": "ಸೆ",
    "¸Á": "ಸಾ", "¸ÀÄ": "ಸು", "¸ÀÆ": "ಸೂ", "¸ÀÈ": "ಸೃ", "¸À": "ಸ", "¸": "ಸ",
    "¸ï": "ಸ್", "¸Ë": "ಸೌ", "¹Ã": "ಸೀ", "¹": "ಸಿ",

    # HA (º)
    "ºÉÆÃ": "ಹೋ", "ºÉÆ": "ಹೊ", "ºÉÃ": "ಹೇ", "ºÉÊ": "ಹೈ", "ºÉ": "ಹೆ",
    "ºÁ": "ಹಾ", "ºÀÄ": "ಹು", "ºÀÆ": "ಹೂ", "ºÀÈ": "ಹೃ", "ºÀ": "ಹ", "º": "ಹ",
    "ºï": "ಹ್", "ºË": "ಹೌ", "»Ã": "ಹೀ", "»": "ಹಿ",

    # LLA (¼)
    "¼ÉÆÃ": "ಳೋ", "¼ÉÆ": "ಳೊ", "¼ÉÃ": "ಳೇ", "¼ÉÊ": "ಳೈ", "¼É": "ಳೆ",
    "¼Á": "ಳಾ", "¼ÀÄ": "ಳು", "¼ÀÆ": "ಳೂ", "¼À": "ಳ", "¼": "ಳ",
    "¼ï": "ಳ್", "¼Ë": "ಳೌ", "½Ã": "ಳೀ", "½": "ಳಿ",
}


def is_nudi_encoded(text: str) -> bool:
    """Returns True if the text contains high concentrations of characteristic Nudi ASCII glyphs."""
    if not text:
        return False
    # Characters that are highly unique to KaGaPa Nudi encoding
    nudi_markers = set("ÀÁÄÉª£¸¼Ûæåèßð«±²¹¢¤½¹¯ÖÜÝéÌë¬ü»ÊïàäçîÑ¦ÞËâ¶ÚÎ×ÕØö")
    count = sum(1 for c in text if c in nudi_markers)
    return count > 3 or (len(text) > 0 and count / len(text) > 0.05)


def _normalize_nudi_vattu_vowels(word: str) -> str:
    """
    Normalizes complex Nudi glyph orderings:
    E.g. Consonant + É + Vattu + Ã -> Consonant + Vattu + Ee-kaara (ÉÃ)
    """
    # 1. Strip zero-width ligature artifact ö if used as vattu bridge
    word = word.replace("ö", "")

    # 2. Reorder Consonant + É + Vattu + Ã
    # e.g., ªÀÄ¯ÉèÃ±ÀégÀA -> ªÀÄ¯èÉÃ±ÀégÀA
    pattern = r'([PQRUVWXYZabcdefghijklmnopqrstuvwxyz£¥§¨ª±µº¼®¯°¢¤½¹])É([Ì-îç])Ã'
    word = re.sub(pattern, r'\1\2ÉÃ', word)
    return word


def is_english_token(token: str) -> bool:
    """
    Detects whether a token is an English word, acronym, or Roman numeral rather than KaGaPa Nudi.
    Guarantees English words like 'Chapter', 'Panchayath', 'Development', 'Officer',
    acronyms like 'PDO', 'ECI', 'WHO', and Roman numerals like 'IV', 'ii' are preserved intact.
    """
    clean = re.sub(r'^[(\[\{<"\']+|[)\]\}>"\',.:;!?]+$', '', token)
    if not clean or len(clean) < 2:
        return False
    # If it contains any non-ASCII character (Latin-1 extension / Nudi glyph), it is Nudi
    if any(ord(c) >= 128 for c in clean):
        return False
    # Common 2-letter English grammatical words
    if clean.lower() in {"of", "in", "to", "on", "at", "by", "as", "is", "it", "an", "or", "if", "we", "he", "me", "us", "my", "no", "so", "up", "am", "do", "go"}:
        return True
    # Roman numerals
    if re.match(r'^(?:[IVXLCDM]+|[ivxlcdm]+)$', clean):
        return True
    # English TitleCase words (e.g. Chapter, Panchayath, Development, Officer)
    if re.match(r'^[A-Z][a-z]{2,}$', clean):
        if any(v in clean.lower() for v in "aeiouy"):
            return True
    # English lowercase words (e.g. different, building, services)
    if re.match(r'^[a-z]{3,}$', clean):
        if any(v in clean for v in "aeiouy") and not any(clean.startswith(p) for p in ["jP", "rP"]):
            return True
    # English acronyms (e.g. PDO, ECI, BBMP, SEBI, WHO, USA)
    if re.match(r'^[A-Z]{3,}$', clean):
        return True
    return False


def convert_nudi_word(word: str) -> str:
    """Converts a single whitespace-delimited word from Nudi ASCII to Unicode Kannada."""
    if not word:
        return ""

    # Preserve English words and acronyms
    if is_english_token(word):
        return word

    # Handle hyphenated compounds (e.g. 'PDO-Panchayath' or 'CzsÁåAiÀÄ-16')
    if "-" in word:
        parts = word.split("-")
        return "-".join(convert_nudi_word(p) for p in parts)

    # Check if word contains any legacy font character or single-letter vowel
    has_legacy = any(
        (0x00A0 <= ord(c) <= 0x00FF)
        or c in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
        for c in word
    )
    if not has_legacy:
        return word

    # Normalize complex vowel ligatures
    word = _normalize_nudi_vattu_vowels(word)

    i = 0
    n = len(word)
    out: List[str] = []

    while i < n:
        char = word[i]

        # 1. Arkavattu (Repha: ð)
        if char == "ð":
            # In Unicode Kannada, Repha (ರ್) is placed before the base consonant of the current syllable
            if out:
                idx = len(out) - 1
                while idx > 0 and out[idx] in DEPENDENT_VOWELS:
                    idx -= 1
                out.insert(idx, "ರ್")
            else:
                out.append("ರ್")
            i += 1
            continue

        # 2. Vattakshara (Subscript Conjuncts)
        if char in VATTAKSHARAGALU:
            vattu_char = VATTAKSHARAGALU[char]
            if out:
                last = out.pop()
                if last and last[-1] in DEPENDENT_VOWELS and last[-1] != "್":
                    dep_vowel = last[-1]
                    base = last[:-1]
                    out.append(base)
                    out.append("್")
                    out.append(vattu_char)
                    out.append(dep_vowel)
                else:
                    out.append(last)
                    out.append("್")
                    out.append(vattu_char)
            else:
                out.append("್")
                out.append(vattu_char)
            i += 1
            continue

        # 3. Greedy longest-match lookup
        matched = False
        max_slice = min(n - i, 6)
        for length in range(max_slice, 0, -1):
            sub = word[i:i + length]
            if sub in MAPPING:
                out.append(MAPPING[sub])
                i += length
                matched = True
                break

        if not matched:
            out.append(char)
            i += 1

    result = "".join(out)
    # Normalize duplicate consecutive dependent vowels (e.g. ಿ + ೀ -> ೀ)
    result = re.sub(r'[\u0CBF][\u0CC0]', '\u0CC0', result)
    return result


def convert_nudi_text(text: str) -> str:
    """
    Transforms KaGaPa/Nudi ASCII-encoded text into clean Unicode Kannada.
    Preserves English, digits, punctuation, and layout.
    """
    if not text:
        return ""

    lines = text.split("\n")
    converted_lines = []
    for line in lines:
        # Preserve whitespace tokens exactly
        tokens = re.split(r'(\s+)', line)
        conv_tokens = [convert_nudi_word(t) if not t.isspace() else t for t in tokens]
        converted_lines.append("".join(conv_tokens))

    return "\n".join(converted_lines)
