#!/usr/bin/env python3
"""Record items included in an issue so later harvests skip them.

Usage: python3 climate-digest/tools/mark_seen.py "<doi or url>|<title>" ["<doi or url>|<title>" ...]
"""
import json
import re
import sys
from pathlib import Path

SEEN = Path(__file__).resolve().parents[1] / "state" / "seen.json"
seen = json.loads(SEEN.read_text()) if SEEN.exists() else {"ids": [], "titles": []}
for arg in sys.argv[1:]:
    ident, _, title = arg.partition("|")
    ident = re.sub(r"^https?://(dx\.)?doi\.org/", "", ident.strip()).lower()
    if ident and ident not in seen["ids"]:
        seen["ids"].append(ident)
    nt = re.sub(r"[^a-z0-9]+", " ", title.lower()).strip()
    if nt and nt not in seen["titles"]:
        seen["titles"].append(nt)
seen["ids"].sort()
seen["titles"].sort()
SEEN.write_text(json.dumps(seen, indent=1))
print(f"seen: {len(seen['ids'])} ids, {len(seen['titles'])} titles")
